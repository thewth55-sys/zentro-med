"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileText, Loader2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ContentType = "reel" | "carrusel" | "historia";
type PieceStatus = "pending" | "approved" | "rejected";

interface MarketingContentPiece {
  id: string;
  title: string;
  content_type: ContentType;
  drive_url: string;
  scheduled_publish_at: string | null;
  status: PieceStatus;
  feedback: string | null;
}

type DialogMode = "reject" | "feedback" | null;

const STATUS_STYLES: Record<PieceStatus, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  rejected: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400",
};

function driveEmbedUrl(driveUrl: string): string | null {
  const match = driveUrl.match(/\/file\/d\/([^/]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
}

export function MarketingContentList() {
  const t = useTranslations("Marketing.content");
  const [pieces, setPieces] = useState<MarketingContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    async function fetchPieces() {
      try {
        const res = await fetch("/api/marketing-content-pieces");
        const data = await res.json().catch(() => null);
        setPieces((data?.pieces ?? []) as MarketingContentPiece[]);
      } catch (err) {
        console.error("[MarketingContentList] fetch failed:", err);
        toast.error(t("actions.loadError"));
      } finally {
        setLoading(false);
      }
    }
    void fetchPieces();
  }, [t]);

  async function updatePiece(id: string, update: { status?: "approved" | "rejected"; feedback?: string }) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/marketing-content-pieces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? t("actions.error"));
        return;
      }
      setPieces((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.piece } : p)));
      toast.success(t("actions.success"));
    } catch (err) {
      console.error("[MarketingContentList] update failed:", err);
      toast.error(t("actions.error"));
    } finally {
      setBusyId(null);
    }
  }

  function openDialog(mode: DialogMode, id: string) {
    setDialogMode(mode);
    setActiveId(id);
    setNoteText("");
  }

  function closeDialog() {
    setDialogMode(null);
    setActiveId(null);
    setNoteText("");
  }

  async function handleDialogSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !noteText.trim()) {
      toast.error(dialogMode === "reject" ? t("errors.reasonRequired") : t("errors.commentRequired"));
      return;
    }
    if (dialogMode === "reject") {
      await updatePiece(activeId, { status: "rejected", feedback: noteText.trim() });
    } else if (dialogMode === "feedback") {
      await updatePiece(activeId, { feedback: noteText.trim() });
    }
    closeDialog();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (pieces.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <FileText className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pieces.map((piece) => {
        const embedUrl = driveEmbedUrl(piece.drive_url);
        const isBusy = busyId === piece.id;
        return (
          <Card key={piece.id}>
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">{piece.title}</h3>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[piece.status]}`}
                >
                  {t(`statusValues.${piece.status}`)}
                </span>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {t(`contentTypeValues.${piece.content_type}`)}
                </span>
              </div>

              {piece.scheduled_publish_at && (
                <p className="text-sm text-muted-foreground">
                  {t("scheduledFor", {
                    date: new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                      new Date(piece.scheduled_publish_at),
                    ),
                  })}
                </p>
              )}

              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="aspect-video w-full rounded-lg border border-border"
                  allow="autoplay"
                />
              ) : (
                <a
                  href={piece.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline underline-offset-2"
                >
                  {t("viewOnDrive")}
                </a>
              )}

              {piece.status === "pending" ? (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => updatePiece(piece.id, { status: "approved" })} disabled={isBusy}>
                    {isBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                    {t("actions.approve")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => openDialog("reject", piece.id)}
                    disabled={isBusy}
                  >
                    {t("actions.reject")}
                  </Button>
                  <Button variant="outline" onClick={() => openDialog("feedback", piece.id)} disabled={isBusy}>
                    {t("actions.feedback")}
                  </Button>
                </div>
              ) : (
                piece.feedback && (
                  <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MessageSquare className="mt-0.5 size-4 shrink-0" />
                    <span>{piece.feedback}</span>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "reject" ? t("dialogs.rejectTitle") : t("dialogs.feedbackTitle")}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "reject" ? t("dialogs.rejectDescription") : t("dialogs.feedbackDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDialogSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="note-text">
                {dialogMode === "reject" ? t("actions.reject") : t("actions.feedback")}
              </Label>
              <Textarea
                id="note-text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={busyId === activeId}>
                {busyId === activeId ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("actions.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
