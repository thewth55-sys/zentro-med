"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LogIn, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

interface ImpersonateButtonProps {
  accountId: string;
  accountName: string;
  ownerEmail: string | null;
}

/**
 * Ends the admin's own session and starts one as the account's
 * owner — see the impersonate route's header comment for why there's
 * no dual-session "return to admin" mechanism yet. The confirm
 * dialog exists because this action is irreversible from the UI's
 * point of view (only a fresh login gets the admin back).
 */
export function ImpersonateButton({ accountId, accountName, ownerEmail }: ImpersonateButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform-admin/accounts/${accountId}/impersonate`, {
        method: "POST",
      });
      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.tokenHash) {
        toast.error(body?.error ?? "No se pudo iniciar la impersonación");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: body.tokenHash,
        type: "magiclink",
      });

      if (error) {
        toast.error(`No se pudo establecer la sesión: ${error.message}`);
        setLoading(false);
        return;
      }

      // Full reload (not router.push) so the server/middleware pick
      // up the freshly-written session cookies immediately.
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("[ImpersonateButton] failed:", err);
      toast.error("No se pudo iniciar la impersonación");
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={!ownerEmail}
        title={ownerEmail ? undefined : "Esta cuenta no tiene un dueño con email resuelto"}
      >
        <LogIn className="h-3.5 w-3.5" />
        Impersonar
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Impersonar a {accountName}?</DialogTitle>
            <DialogDescription>
              Vas a iniciar sesión como <span className="text-foreground">{ownerEmail}</span>.
              Esto reemplaza tu sesión de admin actual — para volver, cierra sesión y entra de
              nuevo con tu propia cuenta. La acción queda registrada en el log de auditoría.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Impersonar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
