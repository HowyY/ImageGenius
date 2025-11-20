import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Sparkles, Image as ImageIcon, Plus } from "lucide-react";
import type { SelectGenerationHistory } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { addUserReferenceImage } from "@/lib/generationState";
import { useToast } from "@/hooks/use-toast";

export default function History() {
  const [addedImages, setAddedImages] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  const { data: history, isLoading } = useQuery<SelectGenerationHistory[]>({
    queryKey: ["/api/history"],
    refetchInterval: 30000,
  });

  const handleAddAsReference = (imageUrl: string) => {
    const success = addUserReferenceImage(imageUrl);
    if (success) {
      setAddedImages(prev => new Set(prev).add(imageUrl));
      toast({
        title: "Added to references",
        description: "Image added to reference images list.",
      });
    } else {
      toast({
        title: "Cannot add",
        description: "Maximum 3 reference images or image already added.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-title">
            Generation History
          </h1>
          <p className="text-muted-foreground" data-testid="text-subtitle">
            View all your previously generated images
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full h-48" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-title">
                No generation history yet
              </h3>
              <p className="text-muted-foreground" data-testid="text-empty-description">
                Start creating images to see them appear here
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden hover-elevate"
                data-testid={`card-history-${item.id}`}
              >
                <div className="relative aspect-video bg-muted">
                  <img
                    src={item.generatedImageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover"
                    data-testid={`img-generated-${item.id}`}
                    loading="lazy"
                  />
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" data-testid={`badge-style-${item.id}`}>
                      <Sparkles className="w-3 h-3 mr-1" />
                      {item.styleLabel}
                    </Badge>
                    <Badge variant="outline" data-testid={`badge-engine-${item.id}`}>
                      {item.engine}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2 text-base" data-testid={`text-prompt-${item.id}`}>
                    {item.prompt}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1" data-testid={`text-time-${item.id}`}>
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddAsReference(item.generatedImageUrl)}
                      data-testid={`button-add-reference-${item.id}`}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add as Reference
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      data-testid={`button-view-${item.id}`}
                    >
                      <a
                        href={item.generatedImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-start"
                      >
                        View full image →
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
