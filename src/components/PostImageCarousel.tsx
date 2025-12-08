import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostImageCarouselProps {
  images: string[];
  className?: string;
  onImageClick?: (index: number) => void;
}

export const PostImageCarousel = ({ images, className, onImageClick }: PostImageCarouselProps) => {
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const goTo = (direction: "prev" | "next") => {
    setIndex((prev) => {
      if (direction === "next") {
        return prev === images.length - 1 ? 0 : prev + 1;
      }
      return prev === 0 ? images.length - 1 : prev - 1;
    });
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/10 shadow-lg",
        "min-h-[220px]",
        className
      )}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            className="flex h-full w-full flex-shrink-0 cursor-pointer items-center justify-center bg-gradient-to-br from-background via-muted/60 to-background"
            onClick={() => onImageClick?.(idx)}
          >
            <img
              src={src}
              alt={`Post image ${idx + 1}`}
              className="max-h-[520px] max-w-full rounded-xl object-contain shadow-md"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => goTo("prev")}
        className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-background/80 p-2 text-foreground shadow-lg backdrop-blur hover:bg-background"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => goTo("next")}
        className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-background/80 p-2 text-foreground shadow-lg backdrop-blur hover:bg-background"
        aria-label="Next image"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
        {images.map((_, dotIdx) => (
          <span
            key={dotIdx}
            className={cn(
              "h-1.5 w-6 rounded-full bg-white/40",
              dotIdx === index && "bg-white shadow"
            )}
          />
        ))}
      </div>
    </div>
  );
};

