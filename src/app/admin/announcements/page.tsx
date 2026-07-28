"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Megaphone, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlatformAnnouncement } from "@/types";

function isLive(a: PlatformAnnouncement): boolean {
  if (!a.is_active) return false;
  const now = Date.now();
  if (a.starts_at && new Date(a.starts_at).getTime() > now) return false;
  if (a.ends_at && new Date(a.ends_at).getTime() < now) return false;
  return true;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/platform-admin/announcements", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudieron cargar los avisos");
      setAnnouncements(data.announcements ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setTitle("");
    setBody("");
    setImageUrl("");
    setLinkUrl("");
    setLinkLabel("");
    setStartsAt("");
    setEndsAt("");
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch("/api/platform-admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          imageUrl: imageUrl.trim() || null,
          linkUrl: linkUrl.trim() || null,
          linkLabel: linkLabel.trim() || null,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo crear el aviso");
      toast.success("Aviso creado");
      setDialogOpen(false);
      resetForm();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el aviso");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(a: PlatformAnnouncement) {
    setTogglingId(a.id);
    try {
      const res = await fetch(`/api/platform-admin/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !a.is_active }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo actualizar");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(a: PlatformAnnouncement) {
    setDeletingId(a.id);
    try {
      const res = await fetch(`/api/platform-admin/announcements/${a.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Avisos y promociones</h1>
          <p className="text-sm text-muted-foreground">
            Mensajes que aparecen en el slider del panel de todas las cuentas mientras estén
            activos y dentro de su rango de fechas.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> Crear aviso
        </Button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : !announcements ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando avisos…
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">Todavía no hay avisos</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-foreground">{a.title}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{a.body}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.starts_at ? new Date(a.starts_at).toLocaleDateString() : "—"}
                    {" → "}
                    {a.ends_at ? new Date(a.ends_at).toLocaleDateString() : "Sin límite"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isLive(a) ? "default" : "outline"}>
                      {isLive(a) ? "En vivo" : a.is_active ? "Programado/vencido" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={togglingId === a.id}
                        onClick={() => handleToggle(a)}
                      >
                        {togglingId === a.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : a.is_active ? (
                          "Desactivar"
                        ) : (
                          "Activar"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === a.id}
                        onClick={() => handleDelete(a)}
                      >
                        {deletingId === a.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear aviso</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ann-title">Título</Label>
              <Input
                id="ann-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="20% de descuento en tu renovación"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-body">Mensaje</Label>
              <Textarea
                id="ann-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Renueva antes de fin de mes y obtén un mes gratis."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-image">Imagen (URL, opcional)</Label>
              <Input
                id="ann-image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ann-link">Enlace (opcional)</Label>
                <Input
                  id="ann-link"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-link-label">Texto del botón</Label>
                <Input
                  id="ann-link-label"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="Ver más"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ann-starts">Inicia (opcional)</Label>
                <Input
                  id="ann-starts"
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-ends">Termina (opcional)</Label>
                <Input
                  id="ann-ends"
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving || !title.trim() || !body.trim()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
