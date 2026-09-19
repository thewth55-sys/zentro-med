"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

interface MarketingAccount {
  id: string;
  name: string;
  marketing_addon: boolean;
}

async function fetchMarketingAccounts() {
  const res = await fetch("/api/platform-admin/marketing-accounts", { cache: "no-store" });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "No se pudo cargar las cuentas de marketing");
  return body.accounts;
}

export default function AdminMarketingAccountsList() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<MarketingAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const accounts = await fetchMarketingAccounts();
        setAccounts(accounts);
      } catch (err) {
        console.error("[AdminMarketingAccountsList] error:", err);
        toast.error(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleToggle = (id: string, enabled: boolean) => {
    try {
      fetch(`/api/platform-admin/accounts/${id}/marketing-addon`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      }).then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error ?? "No se pudo actualizar el estado del add-on");
        }
        setAccounts(prevAccounts => prevAccounts.map(acc => acc.id === id ? { ...acc, marketing_addon: enabled } : acc));
        toast.success("Estado actualizado exitosamente");
      }).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Error al actualizar el estado");
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar el estado");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return <p>No hay cuentas.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>MaaS</TableHead>
          <TableHead>Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((acc) => (
          <TableRow key={acc.id}>
            <TableCell>{acc.name}</TableCell>
            <TableCell>
              <Switch
                checked={acc.marketing_addon}
                onCheckedChange={(v: boolean) => handleToggle(acc.id, v)}
              />
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/admin/accounts/${acc.id}/marketing-content`)}
              >
                Ver contenido
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}