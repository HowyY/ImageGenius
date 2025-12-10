import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { SelectStoryboardScene } from "@shared/schema";

interface ViewerSceneCardProps {
  scene: SelectStoryboardScene;
  onImageClick?: (imageUrl: string) => void;
}

export function ViewerSceneCard({ scene, onImageClick }: ViewerSceneCardProps) {
  const [imagesExpanded, setImagesExpanded] = useState(true);

  const generatedImages = scene.generatedImageUrl ? [scene.generatedImageUrl] : [];
  const hasImages = generatedImages.length > 0;

  return (
    <Card 
      className="overflow-visible flex flex-col"
      data-testid={`viewer-scene-card-${scene.id}`}
    >
      <div 
        className="relative aspect-video bg-muted cursor-pointer"
        onClick={() => hasImages && onImageClick?.(generatedImages[0])}
        data-testid={`viewer-scene-image-${scene.id}`}
      >
        {hasImages ? (
          <img
            src={generatedImages[0]}
            alt="Scene image"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image generated
          </div>
        )}
      </div>

      <Collapsible open={imagesExpanded} onOpenChange={setImagesExpanded}>
        <CollapsibleTrigger 
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          data-testid={`viewer-toggle-images-${scene.id}`}
        >
          {imagesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>Generated Images ({generatedImages.length})</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {hasImages ? (
            <div className="flex gap-2 px-3 pb-3 overflow-x-auto">
              {generatedImages.map((url, index) => (
                <div 
                  key={index}
                  className="w-16 h-12 flex-shrink-0 rounded-md overflow-hidden cursor-pointer ring-2 ring-primary"
                  onClick={() => onImageClick?.(url)}
                  data-testid={`viewer-thumbnail-${scene.id}-${index}`}
                >
                  <img
                    src={url}
                    alt={`Generated ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 pb-3 text-sm text-muted-foreground">
              No images generated yet
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <div className="border-t px-3 py-3 space-y-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Voice Over</div>
          <div 
            className="text-sm bg-muted/30 rounded-md p-2 min-h-[2.5rem]"
            data-testid={`viewer-voiceover-${scene.id}`}
          >
            {scene.voiceOver || <span className="text-muted-foreground italic">No voice over</span>}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Visual Description</div>
          <div 
            className="text-sm bg-muted/30 rounded-md p-2 min-h-[4rem]"
            data-testid={`viewer-description-${scene.id}`}
          >
            {scene.visualDescription || <span className="text-muted-foreground italic">No description</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}
