import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Images } from "lucide-react";

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
}

interface LightboxProps {
  images: LightboxImage[];
  isOpen: boolean;
  initialIndex?: number;
  onClose: () => void;
}

export function Lightbox({ images, isOpen, initialIndex = 0, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => { setIdx(initialIndex); }, [initialIndex, isOpen]);

  const prev = useCallback(() => setIdx(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, prev, next]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const img = images[idx];

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white transition p-2 rounded-full bg-white/10 hover:bg-white/20"
        onClick={onClose}
        data-testid="button-lightbox-close"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
        {idx + 1} / {images.length}
      </div>

      {/* Prev */}
      {images.length > 1 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition p-3 rounded-full bg-white/10 hover:bg-white/20"
          onClick={e => { e.stopPropagation(); prev(); }}
          data-testid="button-lightbox-prev"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={img.src}
          alt={img.alt}
          className="max-h-[75vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl"
          data-testid={`image-lightbox-${idx}`}
        />
        {img.caption && (
          <p className="text-white/60 text-sm text-center px-4">{img.caption}</p>
        )}
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition p-3 rounded-full bg-white/10 hover:bg-white/20"
          onClick={e => { e.stopPropagation(); next(); }}
          data-testid="button-lightbox-next"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i); }}
              className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-primary w-5" : "bg-white/30"}`}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ScreenshotButtonProps {
  appName: string;
  images: LightboxImage[];
}

export function ScreenshotsButton({ appName, images }: ScreenshotButtonProps) {
  const [open, setOpen] = useState(false);
  const [startIdx, setStartIdx] = useState(0);

  const handleOpen = (i = 0) => { setStartIdx(i); setOpen(true); };

  return (
    <>
      <button
        data-testid={`button-screenshots-${appName.toLowerCase().replace(/\s+/g, "-")}`}
        onClick={() => handleOpen(0)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
        style={{ borderColor: "rgba(244,166,42,0.3)", color: "#F4A62A", background: "rgba(244,166,42,0.08)" }}
      >
        <Images className="h-3.5 w-3.5" />
        Screenshots
      </button>
      <Lightbox images={images} isOpen={open} initialIndex={startIdx} onClose={() => setOpen(false)} />
    </>
  );
}
