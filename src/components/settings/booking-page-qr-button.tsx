'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Genera el QR en el navegador (sin llamar a ningún servicio externo)
 *  y lo ofrece como PNG descargable — útil para imprimirlo en el
 *  consultorio o pegarlo en materiales físicos. */
export function BookingPageQrButton({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleOpen() {
    setOpen(true);
    if (dataUrl) return;
    setGenerating(true);
    try {
      const png = await QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: '#0B2A1E', light: '#FFFFFF' } });
      setDataUrl(png);
    } catch (err) {
      console.error('QR generation error:', err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
        <QrCode className="size-4" />
        Código QR
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Código QR de tu página</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {generating || !dataUrl ? (
              <div className="flex size-48 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- generated data: URL, not a remote asset
              <img src={dataUrl} alt="Código QR de la página de reserva" className="size-48 rounded-lg border border-border" />
            )}
            <p className="text-center text-xs text-muted-foreground">
              Escanéalo para abrir tu página de reserva — imprímelo en el consultorio o compártelo en tus redes.
            </p>
            {dataUrl ? (
              <a href={dataUrl} download="pagina-de-reserva-qr.png">
                <Button type="button" variant="outline" size="sm">
                  <Download className="size-3.5" />
                  Descargar PNG
                </Button>
              </a>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
