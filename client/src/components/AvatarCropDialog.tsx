import { useState, useCallback, useEffect, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { AvatarCrop } from "@shared/schema";

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  initialCrop?: AvatarCrop;
  onSave: (crop: AvatarCrop) => void;
  characterName?: string;
  styleName?: string;
}

export function AvatarCropDialog({
  open,
  onOpenChange,
  imageUrl,
  initialCrop,
  onSave,
  characterName,
  styleName,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (open && !isInitialized) {
      if (initialCrop) {
        setZoom(initialCrop.zoom);
        setCroppedArea({
          x: initialCrop.x,
          y: initialCrop.y,
          width: 100 / initialCrop.zoom,
          height: 100 / initialCrop.zoom,
        });
      } else {
        setZoom(1);
        setCroppedArea(null);
      }
      setCrop({ x: 0, y: 0 });
      setIsInitialized(true);
    } else if (!open) {
      setIsInitialized(false);
    }
  }, [open, initialCrop, isInitialized]);

  const initialCroppedAreaPercentages = 
    !isInitialized && initialCrop
      ? {
          x: initialCrop.x,
          y: initialCrop.y,
          width: 100 / initialCrop.zoom,
          height: 100 / initialCrop.zoom,
        }
      : undefined;

  const onCropComplete = useCallback(
    (croppedAreaResult: Area, _croppedAreaPixels: Area) => {
      setCroppedArea(croppedAreaResult);
    },
    []
  );

  const handleSave = () => {
    const cropData: AvatarCrop = {
      x: croppedArea?.x ?? 0,
      y: croppedArea?.y ?? 0,
      zoom: zoom,
    };
    onSave(cropData);
    onOpenChange(false);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setIsInitialized(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-avatar-crop">
        <DialogHeader>
          <DialogTitle data-testid="text-crop-dialog-title">
            Set Avatar
            {characterName && styleName && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {characterName} - {styleName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="relative w-full aspect-square rounded-md overflow-hidden bg-muted"
            data-testid="container-crop-area"
          >
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              initialCroppedAreaPercentages={initialCroppedAreaPercentages}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0])}
                className="flex-1"
                data-testid="slider-zoom"
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Drag to position, scroll to zoom
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            data-testid="button-reset-crop"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-crop"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-crop">
            Save Avatar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CroppedAvatarProps {
  imageUrl: string;
  crop?: AvatarCrop;
  className?: string;
  size?: number;
}

export function CroppedAvatar({
  imageUrl,
  crop,
  className = "",
  size = 40,
}: CroppedAvatarProps) {
  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "hsl(var(--muted))",
  };

  const defaultImageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "top center",
  };

  if (!crop || (crop.x === 0 && crop.y === 0 && crop.zoom === 1)) {
    return (
      <div style={containerStyle} className={className}>
        <img src={imageUrl} alt="Avatar" style={defaultImageStyle} />
      </div>
    );
  }

  const cropWidthPct = 100 / crop.zoom;
  const cropPosXPct = crop.x;
  const cropPosYPct = crop.y;
  
  const bgSizeValue = crop.zoom * 100;
  const bgPosX = (cropPosXPct / (100 - cropWidthPct)) * 100;
  const bgPosY = (cropPosYPct / (100 - cropWidthPct)) * 100;

  const bgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: `${bgSizeValue}%`,
    backgroundPosition: `${isFinite(bgPosX) ? bgPosX : 0}% ${isFinite(bgPosY) ? bgPosY : 0}%`,
    backgroundRepeat: "no-repeat",
  };

  return (
    <div style={containerStyle} className={className}>
      <div style={bgStyle} />
    </div>
  );
}
