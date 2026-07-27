"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface PdfViewerProps {
  /** Signed (or any fetchable) URL to the PDF. */
  url: string;
  className?: string;
  /** Rendered page width in CSS px — page height follows the PDF's own aspect ratio. */
  width?: number;
  downloadLabel?: string;
  loadingLabel?: string;
  errorLabel?: string;
}

const DEFAULT_WIDTH = 640;

/**
 * Renders a remote PDF page-by-page onto a <canvas> via pdfjs-dist,
 * instead of an <iframe src="...pdf">. Embedding a PDF in an iframe
 * relies on the browser having a native inline PDF viewer — desktop
 * Chrome/Firefox/Edge do, but most mobile browsers and nearly every
 * in-app WebView (WhatsApp, Instagram, etc.) don't, and silently show
 * a broken-content icon instead. Canvas rendering works identically
 * everywhere since pdfjs-dist does the rendering itself in JS.
 */
export function PdfViewer({
  url,
  className,
  width = DEFAULT_WIDTH,
  downloadLabel = "Descargar PDF",
  loadingLabel = "Cargando PDF…",
  errorLabel = "No se pudo previsualizar el PDF.",
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const pdf = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);

        const page = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / baseViewport.width });

        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error("PdfViewer render error:", err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, pageNumber, width]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 rounded-md border border-border bg-muted/30 p-6 ${className ?? ""}`}>
        <p className="text-sm text-muted-foreground">{errorLabel}</p>
        <a href={url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
          {downloadLabel}
        </a>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="relative w-full overflow-auto rounded-md border border-border bg-muted/30 p-2">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">{loadingLabel}</span>
          </div>
        )}
        <canvas ref={canvasRef} className={`mx-auto ${loading ? "hidden" : ""}`} />
      </div>
      {pageCount > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          {pageNumber} / {pageCount}
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))}
            disabled={pageNumber >= pageCount}
            className="disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
