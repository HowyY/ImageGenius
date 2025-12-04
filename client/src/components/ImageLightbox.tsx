import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, X, Maximize2, Download } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageLightboxProps {
  src: string;
  alt: string;
  trigger?: React.ReactNode;
  className?: string;
}

function getDistance(touches: React.TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function ImageLightbox({ src, alt, trigger, className }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [pinchStart, setPinchStart] = useState({ distance: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 4;
  const ZOOM_STEP = 0.25;

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + ZOOM_STEP, MAX_SCALE));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - ZOOM_STEP, MIN_SCALE));
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename = src.split("/").pop() || `image-${Date.now()}.png`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(src, "_blank");
    }
  }, [src]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((prev) => Math.min(Math.max(prev + delta, MIN_SCALE), MAX_SCALE));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, scale, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      setIsPinching(true);
      setIsDragging(false);
      const distance = getDistance(e.touches);
      setPinchStart({ distance, scale });
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (isPinching && e.touches.length === 2) {
      const currentDistance = getDistance(e.touches);
      const MIN_PINCH_DISTANCE = 10;
      
      if (pinchStart.distance < MIN_PINCH_DISTANCE) {
        if (currentDistance >= MIN_PINCH_DISTANCE) {
          setPinchStart({ distance: currentDistance, scale });
        }
      } else if (currentDistance > 0) {
        const scaleRatio = currentDistance / pinchStart.distance;
        const newScale = Math.min(Math.max(pinchStart.scale * scaleRatio, MIN_SCALE), MAX_SCALE);
        setScale(newScale);
      }
    } else if (isDragging && e.touches.length === 1 && scale > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  }, [isPinching, isDragging, scale, dragStart, pinchStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setIsPinching(false);
    } else if (e.touches.length === 1) {
      setIsPinching(false);
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    }
  }, [scale, position]);

  useEffect(() => {
    if (!open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      setIsPinching(false);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      switch (e.key) {
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "0":
          handleReset();
          break;
        case "Escape":
          setOpen(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleZoomIn, handleZoomOut, handleReset]);

  const isMobile = typeof window !== "undefined" && "ontouchstart" in window;

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className={className}>
          {trigger}
        </div>
      ) : (
        <div 
          className={`relative group cursor-zoom-in ${className || ""}`}
          onClick={() => setOpen(true)}
        >
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-70 transition-opacity drop-shadow-lg" />
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <VisuallyHidden>
            <DialogTitle>Image Preview</DialogTitle>
            <DialogDescription>Full-size image preview with zoom and pan controls</DialogDescription>
          </VisuallyHidden>
          
          <div className="absolute top-2 right-2 z-50 flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleZoomOut}
              className="text-white hover:bg-white/20"
              data-testid="button-zoom-out"
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
            <span className="text-white text-sm min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleZoomIn}
              className="text-white hover:bg-white/20"
              data-testid="button-zoom-in"
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleReset}
              className="text-white hover:bg-white/20"
              data-testid="button-zoom-reset"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
              data-testid="button-download-image"
            >
              <Download className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-white hover:bg-white/20"
              data-testid="button-close-lightbox"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center overflow-hidden select-none touch-none"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain transition-transform duration-100"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              }}
              draggable={false}
              data-testid="img-lightbox"
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center px-4">
            {isMobile ? "Pinch to zoom | Drag to pan" : "Scroll to zoom | Drag to pan | Press 0 to reset"}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PreviewImageProps {
  src: string;
  alt: string;
  className?: string;
  showZoomHint?: boolean;
  "data-testid"?: string;
}

export function PreviewImage({ src, alt, className, showZoomHint = true, "data-testid": testId }: PreviewImageProps) {
  return (
    <ImageLightbox
      src={src}
      alt={alt}
      className={className}
      trigger={
        <div className="relative group cursor-zoom-in w-full h-full">
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-contain"
            data-testid={testId}
          />
          {showZoomHint && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
              <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
            </div>
          )}
        </div>
      }
    />
  );
}
