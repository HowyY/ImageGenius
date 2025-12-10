import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Paintbrush, Square, Undo2, Trash2, Check, Loader2, RefreshCw } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Point {
  x: number;
  y: number;
}

interface BrushStroke {
  points: Point[];
  color: string;
  size: number;
  normalizedSize: number;
}

interface RectRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionRegion {
  id: string;
  type: "brush" | "rect";
  brushStrokes?: BrushStroke[];
  rect?: RectRegion;
  thumbnailUrl?: string;
}

type SelectionMode = "brush" | "rect";

interface RegionSelectorProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (regions: SelectionRegion[]) => void;
  initialRegions?: SelectionRegion[];
}

export function RegionSelector({
  imageUrl,
  open,
  onClose,
  onConfirm,
  initialRegions = [],
}: RegionSelectorProps) {
  const [mode, setMode] = useState<SelectionMode>("rect");
  const [regions, setRegions] = useState<SelectionRegion[]>(initialRegions);
  const [brushSize, setBrushSize] = useState(20);
  const [currentBrushStrokes, setCurrentBrushStrokes] = useState<BrushStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<BrushStroke | null>(null);
  const [drawingRect, setDrawingRect] = useState<RectRegion | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ regionId: string; handle: string } | null>(null);
  const [dragging, setDragging] = useState<{ regionId: string; startX: number; startY: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageRetryCount, setImageRetryCount] = useState(0);
  const [imageSessionId, setImageSessionId] = useState(0);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const brushColor = "rgba(255, 100, 100, 0.7)";

  useEffect(() => {
    if (open) {
      setImageLoaded(false);
      setImageError(false);
      setImageRetryCount(0);
      setImageSessionId(Date.now());
      setCurrentBrushStrokes([]);
      setSelectedRegionId(null);
      setConfirmError(null);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setRegions(initialRegions);
    }
  }, [open, initialRegions]);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imageRef.current;
    if (!canvas || !container || !img || !imageLoaded) return;

    const containerRect = container.getBoundingClientRect();
    const maxWidth = containerRect.width;
    const maxHeight = containerRect.height;
    
    const aspectRatio = imageDimensions.naturalWidth / imageDimensions.naturalHeight;
    
    let displayWidth = maxWidth;
    let displayHeight = maxWidth / aspectRatio;
    
    if (displayHeight > maxHeight) {
      displayHeight = maxHeight;
      displayWidth = maxHeight * aspectRatio;
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
  }, [imageLoaded, imageDimensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    updateCanvasSize();

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const region of regions) {
      if (region.type === "brush" && region.brushStrokes) {
        drawBrushStrokes(ctx, region.brushStrokes, canvas.width, canvas.height);
      } else if (region.type === "rect" && region.rect) {
        drawRectRegion(ctx, region.rect, canvas.width, canvas.height, region.id === selectedRegionId);
      }
    }

    drawBrushStrokes(ctx, currentBrushStrokes, canvas.width, canvas.height);

    if (currentStroke) {
      drawBrushStrokes(ctx, [currentStroke], canvas.width, canvas.height);
    }

    if (drawingRect) {
      drawRectRegion(ctx, drawingRect, canvas.width, canvas.height, false);
    }
  }, [regions, currentBrushStrokes, currentStroke, drawingRect, imageLoaded, imageDimensions, selectedRegionId, updateCanvasSize]);

  const drawBrushStrokes = (ctx: CanvasRenderingContext2D, strokes: BrushStroke[], canvasWidth: number, canvasHeight: number) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * canvasWidth, stroke.points[0].y * canvasHeight);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * canvasWidth, stroke.points[i].y * canvasHeight);
      }
      ctx.stroke();
    }
  };

  const drawRectRegion = (ctx: CanvasRenderingContext2D, rect: RectRegion, canvasWidth: number, canvasHeight: number, selected: boolean) => {
    const x = rect.x * canvasWidth;
    const y = rect.y * canvasHeight;
    const w = rect.width * canvasWidth;
    const h = rect.height * canvasHeight;

    ctx.strokeStyle = selected ? "rgba(59, 130, 246, 0.9)" : "rgba(255, 100, 100, 0.9)";
    ctx.lineWidth = selected ? 3 : 2;
    ctx.setLineDash(selected ? [] : [5, 5]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    ctx.fillStyle = selected ? "rgba(59, 130, 246, 0.15)" : "rgba(255, 100, 100, 0.15)";
    ctx.fillRect(x, y, w, h);

    if (selected) {
      const handleSize = 8;
      ctx.fillStyle = "rgba(59, 130, 246, 1)";
      
      const handles = [
        { x: x - handleSize / 2, y: y - handleSize / 2 },
        { x: x + w / 2 - handleSize / 2, y: y - handleSize / 2 },
        { x: x + w - handleSize / 2, y: y - handleSize / 2 },
        { x: x + w - handleSize / 2, y: y + h / 2 - handleSize / 2 },
        { x: x + w - handleSize / 2, y: y + h - handleSize / 2 },
        { x: x + w / 2 - handleSize / 2, y: y + h - handleSize / 2 },
        { x: x - handleSize / 2, y: y + h - handleSize / 2 },
        { x: x - handleSize / 2, y: y + h / 2 - handleSize / 2 },
      ];

      for (const handle of handles) {
        ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (mode === "brush") {
      const canvas = canvasRef.current;
      const normalizedSize = canvas ? brushSize / canvas.width : brushSize / 500;
      setCurrentStroke({
        points: [coords],
        color: brushColor,
        size: brushSize,
        normalizedSize,
      });
    } else if (mode === "rect") {
      const clickedRegion = findRegionAtPoint(coords);
      if (clickedRegion) {
        setSelectedRegionId(clickedRegion.id);
        const handle = getResizeHandle(clickedRegion, coords);
        if (handle) {
          setResizing({ regionId: clickedRegion.id, handle });
        } else {
          setDragging({ regionId: clickedRegion.id, startX: coords.x, startY: coords.y });
        }
      } else {
        setSelectedRegionId(null);
        setDrawingRect({
          id: `rect_${Date.now()}`,
          x: coords.x,
          y: coords.y,
          width: 0,
          height: 0,
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (mode === "brush" && currentStroke) {
      setCurrentStroke(prev => prev ? {
        ...prev,
        points: [...prev.points, coords],
      } : null);
    } else if (mode === "rect") {
      if (drawingRect) {
        setDrawingRect(prev => prev ? {
          ...prev,
          width: coords.x - prev.x,
          height: coords.y - prev.y,
        } : null);
      } else if (resizing && selectedRegionId) {
        updateRegionResize(selectedRegionId, resizing.handle, coords);
      } else if (dragging && selectedRegionId) {
        updateRegionDrag(selectedRegionId, coords, dragging);
      }
    }
  };

  const handleMouseUp = () => {
    if (mode === "brush" && currentStroke && currentStroke.points.length >= 2) {
      setCurrentBrushStrokes(prev => [...prev, currentStroke]);
    }
    setCurrentStroke(null);

    if (drawingRect && Math.abs(drawingRect.width) > 0.002 && Math.abs(drawingRect.height) > 0.002) {
      const normalizedRect = normalizeRect(drawingRect);
      const newRegion: SelectionRegion = {
        id: normalizedRect.id,
        type: "rect",
        rect: normalizedRect,
      };
      setRegions(prev => [...prev, newRegion]);
      setSelectedRegionId(normalizedRect.id);
    }
    setDrawingRect(null);
    setResizing(null);
    setDragging(null);
  };

  const normalizeRect = (rect: RectRegion): RectRegion => {
    let { x, y, width, height } = rect;
    if (width < 0) {
      x = x + width;
      width = Math.abs(width);
    }
    if (height < 0) {
      y = y + height;
      height = Math.abs(height);
    }
    if (x < 0) { width += x; x = 0; }
    if (y < 0) { height += y; y = 0; }
    if (x + width > 1) { width = 1 - x; }
    if (y + height > 1) { height = 1 - y; }
    return { ...rect, x, y, width: Math.max(0.002, width), height: Math.max(0.002, height) };
  };

  const findRegionAtPoint = (point: Point): SelectionRegion | null => {
    for (let i = regions.length - 1; i >= 0; i--) {
      const region = regions[i];
      if (region.type === "rect" && region.rect) {
        const r = region.rect;
        if (point.x >= r.x && point.x <= r.x + r.width &&
            point.y >= r.y && point.y <= r.y + r.height) {
          return region;
        }
      }
    }
    return null;
  };

  const getResizeHandle = (region: SelectionRegion, point: Point): string | null => {
    if (region.type !== "rect" || !region.rect) return null;
    const r = region.rect;
    const threshold = 0.02;

    const handles = [
      { name: "nw", x: r.x, y: r.y },
      { name: "n", x: r.x + r.width / 2, y: r.y },
      { name: "ne", x: r.x + r.width, y: r.y },
      { name: "e", x: r.x + r.width, y: r.y + r.height / 2 },
      { name: "se", x: r.x + r.width, y: r.y + r.height },
      { name: "s", x: r.x + r.width / 2, y: r.y + r.height },
      { name: "sw", x: r.x, y: r.y + r.height },
      { name: "w", x: r.x, y: r.y + r.height / 2 },
    ];

    for (const handle of handles) {
      if (Math.abs(point.x - handle.x) < threshold && Math.abs(point.y - handle.y) < threshold) {
        return handle.name;
      }
    }
    return null;
  };

  const updateRegionResize = (regionId: string, handle: string, coords: Point) => {
    setRegions(prev => prev.map(region => {
      if (region.id !== regionId || region.type !== "rect" || !region.rect) return region;
      const r = { ...region.rect };

      switch (handle) {
        case "nw":
          r.width += r.x - coords.x;
          r.height += r.y - coords.y;
          r.x = coords.x;
          r.y = coords.y;
          break;
        case "n":
          r.height += r.y - coords.y;
          r.y = coords.y;
          break;
        case "ne":
          r.width = coords.x - r.x;
          r.height += r.y - coords.y;
          r.y = coords.y;
          break;
        case "e":
          r.width = coords.x - r.x;
          break;
        case "se":
          r.width = coords.x - r.x;
          r.height = coords.y - r.y;
          break;
        case "s":
          r.height = coords.y - r.y;
          break;
        case "sw":
          r.width += r.x - coords.x;
          r.x = coords.x;
          r.height = coords.y - r.y;
          break;
        case "w":
          r.width += r.x - coords.x;
          r.x = coords.x;
          break;
      }

      if (r.x < 0) { r.width += r.x; r.x = 0; }
      if (r.y < 0) { r.height += r.y; r.y = 0; }
      if (r.x + r.width > 1) r.width = 1 - r.x;
      if (r.y + r.height > 1) r.height = 1 - r.y;
      r.width = Math.max(0.02, r.width);
      r.height = Math.max(0.02, r.height);

      return { ...region, rect: r };
    }));
  };

  const updateRegionDrag = (regionId: string, coords: Point, dragState: { startX: number; startY: number }) => {
    const deltaX = coords.x - dragState.startX;
    const deltaY = coords.y - dragState.startY;

    setRegions(prev => prev.map(region => {
      if (region.id !== regionId || region.type !== "rect" || !region.rect) return region;
      let newX = region.rect.x + deltaX;
      let newY = region.rect.y + deltaY;
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX + region.rect.width > 1) newX = 1 - region.rect.width;
      if (newY + region.rect.height > 1) newY = 1 - region.rect.height;
      return {
        ...region,
        rect: {
          ...region.rect,
          x: newX,
          y: newY,
        },
      };
    }));

    setDragging({ regionId, startX: coords.x, startY: coords.y });
  };

  const handleUndo = () => {
    if (mode === "brush" && currentBrushStrokes.length > 0) {
      setCurrentBrushStrokes(prev => prev.slice(0, -1));
    } else if (regions.length > 0) {
      setRegions(prev => prev.slice(0, -1));
      setSelectedRegionId(null);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRegionId) {
      setRegions(prev => prev.filter(r => r.id !== selectedRegionId));
      setSelectedRegionId(null);
    }
  };

  const handleSaveBrushAsRegion = () => {
    if (currentBrushStrokes.length === 0) return;
    const newRegion: SelectionRegion = {
      id: `brush_${Date.now()}`,
      type: "brush",
      brushStrokes: [...currentBrushStrokes],
    };
    setRegions(prev => [...prev, newRegion]);
    setCurrentBrushStrokes([]);
  };

  const generateThumbnailForRegion = useCallback((region: SelectionRegion): string | undefined => {
    const img = imageRef.current;
    if (!img || !imageLoaded) return undefined;

    let bounds: { x: number; y: number; width: number; height: number } | null = null;

    if (region.type === "rect" && region.rect) {
      bounds = {
        x: Math.max(0, Math.floor(region.rect.x * img.naturalWidth)),
        y: Math.max(0, Math.floor(region.rect.y * img.naturalHeight)),
        width: Math.min(img.naturalWidth, Math.ceil(region.rect.width * img.naturalWidth)),
        height: Math.min(img.naturalHeight, Math.ceil(region.rect.height * img.naturalHeight)),
      };
    } else if (region.type === "brush" && region.brushStrokes && region.brushStrokes.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const stroke of region.brushStrokes) {
        const normalizedRadius = (stroke.normalizedSize || stroke.size / 500) / 2;
        for (const point of stroke.points) {
          minX = Math.min(minX, point.x - normalizedRadius);
          minY = Math.min(minY, point.y - normalizedRadius);
          maxX = Math.max(maxX, point.x + normalizedRadius);
          maxY = Math.max(maxY, point.y + normalizedRadius);
        }
      }
      const padding = 0.02;
      bounds = {
        x: Math.max(0, Math.floor((minX - padding) * img.naturalWidth)),
        y: Math.max(0, Math.floor((minY - padding) * img.naturalHeight)),
        width: Math.min(img.naturalWidth, Math.ceil((maxX - minX + padding * 2) * img.naturalWidth)),
        height: Math.min(img.naturalHeight, Math.ceil((maxY - minY + padding * 2) * img.naturalHeight)),
      };
    }

    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return undefined;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;

      canvas.width = bounds.width;
      canvas.height = bounds.height;

      ctx.drawImage(
        img,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        0,
        0,
        bounds.width,
        bounds.height
      );

      if (region.type === "brush" && region.brushStrokes) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const stroke of region.brushStrokes) {
          if (stroke.points.length < 2) continue;
          ctx.strokeStyle = stroke.color;
          const scaledLineWidth = (stroke.normalizedSize || stroke.size / 500) * img.naturalWidth;
          ctx.lineWidth = scaledLineWidth;
          ctx.beginPath();
          ctx.moveTo(
            stroke.points[0].x * img.naturalWidth - bounds.x,
            stroke.points[0].y * img.naturalHeight - bounds.y
          );
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(
              stroke.points[i].x * img.naturalWidth - bounds.x,
              stroke.points[i].y * img.naturalHeight - bounds.y
            );
          }
          ctx.stroke();
        }
      }

      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Failed to generate thumbnail:", error);
      return undefined;
    }
  }, [imageLoaded]);

  const handleConfirm = () => {
    setConfirmError(null);
    
    let finalRegions = [...regions];
    if (currentBrushStrokes.length > 0) {
      finalRegions.push({
        id: `brush_${Date.now()}`,
        type: "brush",
        brushStrokes: [...currentBrushStrokes],
      });
    }

    const regionsWithThumbnails = finalRegions.map(region => ({
      ...region,
      thumbnailUrl: generateThumbnailForRegion(region),
    }));

    const validRegions = regionsWithThumbnails.filter(r => r.thumbnailUrl);
    const failedCount = finalRegions.length - validRegions.length;
    
    if (validRegions.length === 0 && finalRegions.length > 0) {
      setConfirmError("Failed to generate region thumbnails. Please retry loading the image.");
      return;
    }
    
    if (failedCount > 0) {
      console.warn(`${failedCount} region(s) failed to generate thumbnails`);
    }

    onConfirm(validRegions);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] p-0 flex flex-col gap-0"
        data-testid="region-selector-dialog"
        hideCloseButton
      >
        <DialogHeader className="flex-none px-4 py-3 border-b">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-base font-medium">Select Regions</DialogTitle>
              <DialogDescription className="sr-only">
                Draw rectangles or brush strokes to select regions of the image for editing
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={mode === "rect" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("rect")}
                data-testid="button-mode-rect"
              >
                <Square className="w-4 h-4 mr-1" />
                Rectangle
              </Button>
              <Button
                variant={mode === "brush" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("brush")}
                data-testid="button-mode-brush"
              >
                <Paintbrush className="w-4 h-4 mr-1" />
                Brush
              </Button>
              
              {mode === "brush" && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm text-muted-foreground">Size:</span>
                  <Slider
                    value={[brushSize]}
                    onValueChange={(v) => setBrushSize(v[0])}
                    min={5}
                    max={50}
                    step={1}
                    className="w-24"
                  />
                  <span className="text-sm w-6">{brushSize}</span>
                </div>
              )}

              <div className="w-px h-6 bg-border mx-1" />

              {mode === "brush" && currentBrushStrokes.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveBrushAsRegion}
                  data-testid="button-save-brush"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Save Brush
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={(mode === "brush" && currentBrushStrokes.length === 0) || (mode === "rect" && regions.length === 0)}
                data-testid="button-undo"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
              {selectedRegionId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteSelected}
                  data-testid="button-delete-region"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              <div className="w-px h-6 bg-border mx-1" />

              {confirmError && (
                <span className="text-sm text-destructive">{confirmError}</span>
              )}

              <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-cancel-region">
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleConfirm} 
                disabled={!imageLoaded}
                data-testid="button-confirm-regions"
              >
                Done ({regions.length + (currentBrushStrokes.length > 0 ? 1 : 0)})
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div 
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-muted/30 min-h-0"
        >
          {imageUrl ? (
            <div className="relative flex items-center justify-center w-full h-full">
              <img
                ref={imageRef}
                src={`${imageUrl}${imageUrl.includes('?') ? '&' : '?'}cors=${imageSessionId}${imageRetryCount > 0 ? `&retry=${imageRetryCount}` : ''}`}
                alt="Source"
                className="max-w-full max-h-full object-contain pointer-events-none"
                crossOrigin="anonymous"
                style={{ display: imageLoaded ? 'block' : 'none' }}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setImageDimensions({
                    width: img.clientWidth,
                    height: img.clientHeight,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                  });
                  setImageError(false);
                  setImageLoaded(true);
                }}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(false);
                }}
              />
              {!imageLoaded && !imageError && (
                <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm">Loading image...</span>
                </div>
              )}
              {imageError && (
                <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <span className="text-sm">Failed to load image</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImageError(false);
                      setImageRetryCount(prev => prev + 1);
                    }}
                    data-testid="button-retry-image"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              )}
              {imageLoaded && (
                <canvas
                  ref={canvasRef}
                  className="absolute cursor-crosshair"
                  style={{ touchAction: "none" }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center text-muted-foreground">
              No image available
            </div>
          )}
        </div>

        {regions.length > 0 && (
          <div className="flex-none px-4 py-3 border-t bg-card">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-sm text-muted-foreground shrink-0">Regions:</span>
              {regions.map((region, index) => (
                <div
                  key={region.id}
                  className={`shrink-0 px-3 py-1 rounded-md text-sm cursor-pointer ${
                    selectedRegionId === region.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted hover-elevate"
                  }`}
                  onClick={() => setSelectedRegionId(region.id === selectedRegionId ? null : region.id)}
                  data-testid={`region-chip-${index}`}
                >
                  {region.type === "rect" ? "Rect" : "Brush"} {index + 1}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
