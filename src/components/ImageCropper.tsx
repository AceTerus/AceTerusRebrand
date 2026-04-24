import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCcw, RotateCw, Loader2, RefreshCw } from "lucide-react";
import { createPortal } from "react-dom";

// ── helpers ──────────────────────────────────────────────────────────────────

export async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  outputType: "image/jpeg" | "image/webp" = "image/jpeg",
  quality = 0.88,
): Promise<Blob> {
  const image = await createImageBitmap(await fetch(imageSrc).then(r => r.blob()));

  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rotW = image.width * cos + image.height * sin;
  const rotH = image.width * sin + image.height * cos;

  const offscreen = document.createElement("canvas");
  offscreen.width  = rotW;
  offscreen.height = rotH;
  const offCtx = offscreen.getContext("2d")!;
  offCtx.translate(rotW / 2, rotH / 2);
  offCtx.rotate(rad);
  offCtx.drawImage(image, -image.width / 2, -image.height / 2);

  const canvas = document.createElement("canvas");
  canvas.width  = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(offscreen, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);

  return new Promise(resolve =>
    canvas.toBlob(b => resolve(b!), outputType, quality),
  );
}

// ── component ─────────────────────────────────────────────────────────────────

interface ImageCropperProps {
  imageSrc: string;
  aspect?: number;
  onConfirm: (blob: Blob, previewUrl: string) => void | Promise<void>;
  onCancel: () => void;
  title?: string;
  allowRotate?: boolean;
}

export const ImageCropper = ({
  imageSrc,
  aspect,
  onConfirm,
  onCancel,
  title = "Crop Image",
  allowRotate = true,
}: ImageCropperProps) => {
  const [crop, setCrop]               = useState({ x: 0, y: 0 });
  const [zoom, setZoom]               = useState(1);
  const [rotation, setRotation]       = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [working, setWorking]         = useState(false);

  const onCropComplete = useCallback((_: Area, px: Area) => setCroppedArea(px), []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setWorking(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea, rotation);
      const previewUrl = URL.createObjectURL(blob);
      await onConfirm(blob, previewUrl);
    } finally {
      setWorking(false);
    }
  };

  const reset = () => { setZoom(1); setRotation(0); setCrop({ x: 0, y: 0 }); };

  const zoomPct  = Math.round((zoom - 1) / 2 * 100);
  const rotLabel = rotation === 0 ? "0°" : rotation > 0 ? `+${rotation}°` : `${rotation}°`;

  return createPortal(
    <>
      {/* Inject scoped slider styles once */}
      <style>{`
        .ic-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.15);
          outline: none;
          cursor: pointer;
        }
        .ic-slider::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 9999px;
        }
        .ic-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3BD6F5, #2F7CFF);
          border: 2.5px solid #fff;
          box-shadow: 0 2px 8px rgba(47,124,255,0.5);
          margin-top: -8px;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .ic-slider:hover::-webkit-slider-thumb { transform: scale(1.15); }
        .ic-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3BD6F5, #2F7CFF);
          border: 2.5px solid #fff;
          box-shadow: 0 2px 8px rgba(47,124,255,0.5);
          cursor: pointer;
        }
      `}</style>

      <div
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{ background: "#080C16" }}
      >
        {/* ── Top bar ── */}
        <div
          className="relative z-10 flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <p className="font-extrabold font-['Baloo_2'] text-white text-[15px] tracking-tight">{title}</p>

          <div className="w-9" />
        </div>

        {/* ── Crop canvas ── */}
        <div className="relative z-0 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            showGrid
            style={{
              containerStyle: { background: "transparent" },
              cropAreaStyle: {
                border: "2px solid rgba(255,255,255,0.85)",
                borderRadius: aspect === 1 ? "50%" : 16,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
              },
            }}
          />
          {/* hint — floats inside crop area without stealing events */}
          <p
            className="absolute bottom-4 left-0 right-0 text-center text-[11px] font-semibold pointer-events-none"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Pinch or scroll to zoom · Drag to reposition
          </p>
        </div>

        {/* ── Controls ── */}
        <div
          className="relative z-10 shrink-0 px-5 pb-8 pt-5 space-y-5"
          style={{ background: "linear-gradient(to top, #080C16 70%, rgba(8,12,22,0.85))", borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              type="range"
              className="ic-slider flex-1"
              min={1} max={3} step={0.01}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
            />
            <ZoomIn className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
            <span
              className="w-11 text-right text-[12px] font-bold tabular-nums font-['Baloo_2'] shrink-0"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              +{zoomPct}%
            </span>
          </div>

          {/* Rotate */}
          {allowRotate && (
            <div className="flex items-center gap-3">
              <RotateCcw className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
              <input
                type="range"
                className="ic-slider flex-1"
                min={-180} max={180} step={1}
                value={rotation}
                onChange={e => setRotation(Number(e.target.value))}
              />
              <RotateCw className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
              <span
                className="w-11 text-right text-[12px] font-bold tabular-nums font-['Baloo_2'] shrink-0"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {rotLabel}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={reset}
              disabled={working}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-extrabold font-['Baloo_2'] transition-all disabled:opacity-30 shrink-0"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={working}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-[14px] font-extrabold font-['Baloo_2'] transition-all active:scale-[0.98]"
              style={{
                background: working
                  ? "rgba(47,124,255,0.35)"
                  : "linear-gradient(135deg,#2F7CFF,#2E2BE5)",
                color: "#fff",
                boxShadow: working ? "none" : "0 4px 20px rgba(47,124,255,0.4)",
                opacity: working ? 0.7 : 1,
              }}
            >
              {working
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : "Use Photo"
              }
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
};
