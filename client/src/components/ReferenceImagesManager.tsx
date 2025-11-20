import { useState } from "react";
import { X, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getUserReferenceImages,
  removeUserReferenceImage,
  reorderUserReferenceImages,
} from "@/lib/generationState";

interface ReferenceImagesManagerProps {
  onUpdate?: () => void;
}

export function ReferenceImagesManager({ onUpdate }: ReferenceImagesManagerProps) {
  const [images, setImages] = useState(getUserReferenceImages());

  const handleRemove = (imageUrl: string) => {
    removeUserReferenceImage(imageUrl);
    setImages(getUserReferenceImages());
    onUpdate?.();
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderUserReferenceImages(index, index - 1);
      setImages(getUserReferenceImages());
      onUpdate?.();
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < images.length - 1) {
      reorderUserReferenceImages(index, index + 1);
      setImages(getUserReferenceImages());
      onUpdate?.();
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Reference Images (Priority Order)</label>
        <span className="text-xs text-muted-foreground">{images.length}/3</span>
      </div>
      <div className="space-y-2">
        {images.map((imageUrl, index) => (
          <Card key={imageUrl} className="p-2">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-muted">
                <img
                  src={imageUrl}
                  alt={`Reference ${index + 1}`}
                  className="w-full h-full object-cover"
                  data-testid={`img-reference-${index}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground truncate">
                  Priority #{index + 1}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  data-testid={`button-move-up-${index}`}
                  className="h-8 w-8"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === images.length - 1}
                  data-testid={`button-move-down-${index}`}
                  className="h-8 w-8"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemove(imageUrl)}
                  data-testid={`button-remove-${index}`}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Images are used in priority order. Move them up/down to change priority.
      </p>
    </div>
  );
}
