"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Loader2, Move, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";

const OUTPUT_WIDTH = 1600;
const OUTPUT_HEIGHT = 900;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

type Point = { x: number; y: number };

type KioskLogoEditorProps = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be opened. Please choose another image."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("The adjusted logo could not be created."));
    }, "image/png");
  });
}

export function KioskLogoEditor({ file, onCancel, onConfirm }: KioskLogoEditorProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ pointer: Point; offset: Point } | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const resetPosition = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointer: { x: event.clientX, y: event.clientY },
      offset,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragStart = dragStartRef.current;
    const frame = frameRef.current;
    if (!dragStart || !frame) return;

    const bounds = frame.getBoundingClientRect();
    const limitX = bounds.width * 0.75;
    const limitY = bounds.height * 0.75;
    const nextX = dragStart.offset.x + event.clientX - dragStart.pointer.x;
    const nextY = dragStart.offset.y + event.clientY - dragStart.pointer.y;

    setOffset({
      x: Math.max(-limitX, Math.min(limitX, nextX)),
      y: Math.max(-limitY, Math.min(limitY, nextY)),
    });
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
  };

  const applyLogo = async () => {
    const frame = frameRef.current;
    if (!previewUrl || !frame) return;

    setProcessing(true);
    setError(null);

    try {
      const image = await loadImage(previewUrl);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The adjusted logo could not be created.");

      const baseScale = Math.min(OUTPUT_WIDTH / image.naturalWidth, OUTPUT_HEIGHT / image.naturalHeight);
      const drawWidth = image.naturalWidth * baseScale * zoom;
      const drawHeight = image.naturalHeight * baseScale * zoom;
      const frameBounds = frame.getBoundingClientRect();
      const offsetScaleX = OUTPUT_WIDTH / frameBounds.width;
      const offsetScaleY = OUTPUT_HEIGHT / frameBounds.height;
      const drawX = (OUTPUT_WIDTH - drawWidth) / 2 + offset.x * offsetScaleX;
      const drawY = (OUTPUT_HEIGHT - drawHeight) / 2 + offset.y * offsetScaleY;

      context.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

      const blob = await canvasToBlob(canvas);
      const baseName = file.name.replace(/\.[^.]+$/, "") || "kiosk-logo";
      const adjustedFile = new File([blob], `${baseName}-adjusted.png`, { type: "image/png" });
      await onConfirm(adjustedFile);
    } catch (adjustError) {
      setError(adjustError instanceof Error ? adjustError.message : "The logo could not be adjusted.");
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-logo-editor-title"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="kiosk-logo-editor-title" className="text-xl font-bold text-slate-950">
              Adjust Kiosk Logo
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Drag the image to position it, then zoom in or out to fit the kiosk frame.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={processing} aria-label="Close logo editor">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div
          ref={frameRef}
          className="relative mx-auto aspect-video w-full max-w-2xl touch-none cursor-move overflow-hidden rounded-xl border-2 border-blue-500 bg-white shadow-inner"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          {previewUrl ? (
            <div
              className="absolute inset-0"
              style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
            >
              <Image
                src={previewUrl}
                alt="Kiosk logo being adjusted"
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="pointer-events-none select-none object-contain"
                style={{ transform: `scale(${zoom})` }}
                draggable={false}
                unoptimized
              />
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-0 rounded-[10px] ring-1 ring-inset ring-white/80" />
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-white">
            <Move className="h-3.5 w-3.5" />
            Drag to reposition
          </div>
        </div>

        <div className="mx-auto mt-5 max-w-2xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => setZoom((current) => Math.max(MIN_ZOOM, Number((current - 0.1).toFixed(2))))}
              disabled={processing || zoom <= MIN_ZOOM}
              className="rounded-full p-1 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-2 w-full cursor-pointer accent-blue-600"
              aria-label="Logo zoom"
            />
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => setZoom((current) => Math.min(MAX_ZOOM, Number((current + 0.1).toFixed(2))))}
              disabled={processing || zoom >= MAX_ZOOM}
              className="rounded-full p-1 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <span className="w-14 text-right text-sm font-semibold tabular-nums text-slate-700">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={resetPosition} disabled={processing} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void applyLogo()} disabled={processing || !previewUrl} className="gap-2">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {processing ? "Uploading..." : "Use Logo"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
