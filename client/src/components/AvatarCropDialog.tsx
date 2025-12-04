import { useState, useCallback, useEffect, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
        // Handle both new format (width/height) and legacy format (zoom)
        let width = initialCrop.width;
        let height = initialCrop.height;
        
        // If using legacy format, derive width/height from zoom
        if (width === undefined || height === undefined) {
          const legacyZoom = initialCrop.zoom ?? 1;
          width = 100 / legacyZoom;
          height = 100 / legacyZoom;
        }
        
        // Calculate zoom from the crop dimensions
        const zoomFromWidth = 100 / width;
        const zoomFromHeight = 100 / height;
        const estimatedZoom = Math.min(zoomFromWidth, zoomFromHeight);
        setZoom(Math.min(3, Math.max(1, estimatedZoom)));
        setCroppedArea({
          x: initialCrop.x,
          y: initialCrop.y,
          width: width,
          height: height,
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

  // Prepare initialCroppedAreaPercentages with legacy format handling
  const getInitialCroppedAreaPercentages = () => {
    if (isInitialized || !initialCrop) return undefined;
    
    let width = initialCrop.width;
    let height = initialCrop.height;
    
    // If using legacy format, derive width/height from zoom
    if (width === undefined || height === undefined) {
      const legacyZoom = initialCrop.zoom ?? 1;
      width = 100 / legacyZoom;
      height = 100 / legacyZoom;
    }
    
    return {
      x: initialCrop.x,
      y: initialCrop.y,
      width: width,
      height: height,
    };
  };
  
  const initialCroppedAreaPercentages = getInitialCroppedAreaPercentages();

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
      width: croppedArea?.width ?? 100,
      height: croppedArea?.height ?? 100,
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
          <DialogDescription className="sr-only">
            Crop and position the avatar image for this character
          </DialogDescription>
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

  // Normalize crop data - handle both new format (width/height) and legacy (zoom)
  let cropWidth = crop?.width;
  let cropHeight = crop?.height;
  
  // If using legacy zoom format, convert to width/height
  // For square images (legacy assumption), width = height = 100/zoom
  if (cropWidth === undefined || cropHeight === undefined) {
    const zoom = crop?.zoom ?? 1;
    cropWidth = 100 / zoom;
    cropHeight = 100 / zoom;
  }

  // Check if no crop or default values (width/height >= 100 means no zoom)
  const isDefaultCrop = !crop || 
    (crop.x === 0 && crop.y === 0 && cropWidth >= 100 && cropHeight >= 100);
  
  if (isDefaultCrop) {
    return (
      <div style={containerStyle} className={className}>
        <img src={imageUrl} alt="Avatar" style={defaultImageStyle} />
      </div>
    );
  }

  // Use an img element for precise crop positioning
  // react-easy-crop provides crop.x, crop.y as top-left percentages
  // and cropWidth, cropHeight as the crop area size in percentages
  
  // Calculate scale factors for each axis
  // scaleX: scale to make cropWidth fill container width (100%)
  // scaleY: scale to make cropHeight fill container height (100%)
  const scaleX = 100 / cropWidth;
  const scaleY = 100 / cropHeight;
  
  // ALWAYS use scaleX for the image width. With height:auto, this gives:
  // - displayed_width = scaleX * 100%
  // - displayed_height = scaleX * 100% * (imageHeight/imageWidth)
  //                    = scaleX * 100% * (cropWidth/cropHeight)
  //                    = scaleY * 100% (due to square crop relationship)
  // This ensures the square crop exactly fills the square container.
  
  // Calculate offsets to position crop at container origin
  // X: crop.x% of displayed_width = crop.x * scaleX in container units
  // Y: crop.y% of displayed_height = crop.y * scaleY in container units
  const offsetX = -crop.x * scaleX;
  const offsetY = -crop.y * scaleY;
  
  // No centering needed: the crop exactly fills the container (100% x 100%)
  
  const imgStyle: React.CSSProperties = {
    position: "absolute",
    width: `${scaleX * 100}%`,
    height: "auto",
    left: `${offsetX}%`,
    top: `${offsetY}%`,
    maxWidth: "none",
  };

  return (
    <div style={containerStyle} className={className}>
      <img src={imageUrl} alt="Avatar" style={imgStyle} />
    </div>
  );
}
