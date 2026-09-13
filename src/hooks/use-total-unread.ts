"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/types";

/**
 * Count of conversations with at least one unread inbound message for
 * the current user. Used by the sidebar to surface a green dot on the
 * Inbox nav entry when the user is elsewhere in the app.
 *
 * Lives on its own realtime channel (distinct from the inbox page's
 * "inbox-realtime") so both can coexist without sharing state.
 */
// Belt-and-suspenders refetch interval. Realtime is the fast path and
// normally all this needs, but a `postgres_changes` subscription can
// miss events after a connection blip (server restart, a brief
// network drop, a websocket reconnect that lands after the change
// already happened) with no visible error — the UI would just be
// silently stuck showing an unread conversation as read until the
// next unrelated re-render. Polling this cheap query on an interval
// bounds how stale the badge can ever get, independent of whatever
// caused a missed event.
const POLL_INTERVAL_MS = 20_000;

export function useTotalUnread(): number {
  const [total, setTotal] = useState(0);

  // Keep a live local mirror of {id: unread_count} so INSERT/UPDATE/DELETE
  // events can adjust the total in O(1) without refetching.
  const countsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Initial load, and the periodic fallback refetch below share this —
    // both just need the current {id: unread_count} snapshot. RLS scopes
    // this to the signed-in user automatically, no explicit filter needed.
    const refetch = async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, unread_count");
      if (cancelled || error || !data) return;

      const map = new Map<string, number>();
      let sum = 0;
      for (const row of data as { id: string; unread_count: number }[]) {
        const n = row.unread_count ?? 0;
        map.set(row.id, n);
        if (n > 0) sum += 1;
      }
      countsRef.current = map;
      setTotal(sum);
    };

    void refetch();
    const pollId = setInterval(() => void refetch(), POLL_INTERVAL_MS);

    // Defensive: a fast remount (React Strict Mode in dev, or an HMR
    // reload) can re-run this effect before the previous cleanup's
    // async `removeChannel()` below has finished its unsubscribe
    // handshake with the server. supabase-js reuses a channel object
    // for a topic that hasn't finished being removed, so `.on()`
    // would be called on an already-subscribed channel and throw
    // ("cannot add `postgres_changes` callbacks ... after
    // channel.subscribe()"). Drop any such stale channel first — a
    // no-op on a normal mount.
    const CHANNEL_NAME = "total-unread-realtime";
    const stale = supabase.getChannels().find((c) => c.topic === `realtime:${CHANNEL_NAME}`);
    if (stale) supabase.removeChannel(stale);

    const channel = supabase
      .channel(CHANNEL_NAME)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          const map = countsRef.current;
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<Conversation>;
            if (oldRow.id) map.delete(oldRow.id);
          } else {
            const row = payload.new as Conversation;
            map.set(row.id, row.unread_count ?? 0);
          }
          // Recompute — cheap, conversations per user stay small.
          let sum = 0;
          for (const n of map.values()) if (n > 0) sum += 1;
          setTotal(sum);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, []);

  return total;
}
