import { useState, useRef } from "react";
import { X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getUserReferenceImages,
  removeUserReferenceImage,
  reorderUserReferenceImages,
  clearUserReferenceImages,
} from "@/lib/generationState";

interface ReferenceImagesManagerProps {
  onUpdate?: () => void;
}

export function ReferenceImagesManager({ onUpdate }: ReferenceImagesManagerProps) {
  const [images, setImages] = useState(getUserReferenceImages());
  const draggedImageUrlRef = useRef<string | null>(null);
  const [dragOverImageUrl, setDragOverImageUrl] = useState<string | null>(null);

  const handleRemove = (imageUrl: string) => {
    removeUserReferenceImage(imageUrl);
    setImages(getUserReferenceImages());
    onUpdate?.();
  };

  const handleClearAll = () => {
    clearUserReferenceImages();
    setImages([]);
    onUpdate?.();
  };

  const handleDragStart = (imageUrl: string) => {
    draggedImageUrlRef.current = imageUrl;
  };

  const handleDragOver = (e: React.DragEvent, imageUrl: string) => {
    e.preventDefault();
    setDragOverImageUrl(imageUrl);
  };

  const handleDragEnter = (e: React.DragEvent, imageUrl: string) => {
    e.preventDefault();
    setDragOverImageUrl(imageUrl);
  };

  const handleDrop = (e: React.DragEvent, targetImageUrl: string) => {
    e.preventDefault();
    
    const draggedImageUrl = draggedImageUrlRef.current;
    if (draggedImageUrl && draggedImageUrl !== targetImageUrl) {
      const currentImages = getUserReferenceImages();
      const draggedIndex = currentImages.indexOf(draggedImageUrl);
      const targetIndex = currentImages.indexOf(targetImageUrl);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        reorderUserReferenceImages(draggedIndex, targetIndex);
        setImages(getUserReferenceImages());
        onUpdate?.();
      }
    }
    
    draggedImageUrlRef.current = null;
    setDragOverImageUrl(null);
  };

  const handleDragEnd = () => {
    draggedImageUrlRef.current = null;
    setDragOverImageUrl(null);
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      e.preventDefault();
      draggedImageUrlRef.current = null;
      setDragOverImageUrl(null);
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2" onDragOver={handleContainerDragOver} onDrop={handleContainerDrop}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">Reference Images (Priority Order)</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{images.length}/3</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearAll}
            data-testid="button-clear-all-references"
            className="h-7 text-xs"
          >
            Clear All
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {images.map((imageUrl, index) => (
          <Card
            key={imageUrl}
            draggable
            onDragStart={() => handleDragStart(imageUrl)}
            onDragOver={(e) => handleDragOver(e, imageUrl)}
            onDragEnter={(e) => handleDragEnter(e, imageUrl)}
            onDrop={(e) => handleDrop(e, imageUrl)}
            onDragEnd={handleDragEnd}
            className={`p-2 transition-all cursor-move ${
              draggedImageUrlRef.current === imageUrl ? "opacity-50" : ""
            } ${
              dragOverImageUrl === imageUrl && draggedImageUrlRef.current !== imageUrl
                ? "border-primary bg-accent/50"
                : ""
            }`}
            data-testid={`card-reference-${index}`}
          >
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5" />
              </div>
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
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemove(imageUrl)}
                data-testid={`button-remove-${index}`}
                className="h-8 w-8 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Drag and drop to reorder. Higher priority images are used first.
      </p>
    </div>
  );
}
