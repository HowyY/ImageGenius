import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Sparkles, Image as ImageIcon, Plus, Check, Copy } from "lucide-react";
import type { SelectGenerationHistory } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { addUserReferenceImage, getUserReferenceImages } from "@/lib/generationState";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ImageWithFallback } from "@/components/ImageWithFallback";

export default function History() {
  const [userRefCount, setUserRefCount] = useState(0);
  const [userRefUrls, setUserRefUrls] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  const { data: history, isLoading } = useQuery<SelectGenerationHistory[]>({
    queryKey: ["/api/history"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    const refs = getUserReferenceImages();
    setUserRefCount(refs.length);
    setUserRefUrls(new Set(refs));
  }, []);

  const handleAddAsReference = (imageUrl: string) => {
    const success = addUserReferenceImage(imageUrl);
    if (success) {
      const refs = getUserReferenceImages();
      setUserRefCount(refs.length);
      setUserRefUrls(new Set(refs));
      toast({
        title: "Added to references",
        description: `Image added to reference list (${refs.length}/3)`,
      });
    } else {
      toast({
        title: "Cannot add",
        description: "Maximum 3 reference images reached or image already exists",
        variant: "destructive",
      });
    }
  };

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast({
        title: "Prompt copied",
        description: "The prompt has been copied to your clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
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
                  <ImageWithFallback
                    src={item.generatedImageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover"
                    data-testid={`img-generated-${item.id}`}
                    loading="lazy"
                    fallbackText="Failed to load image"
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
                    {userRefUrls.has(item.generatedImageUrl) ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Added as Reference
                        </Badge>
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddAsReference(item.generatedImageUrl)}
                              disabled={userRefCount >= 3}
                              data-testid={`button-add-reference-${item.id}`}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {userRefCount >= 3 ? `Full (${userRefCount}/3)` : `Add as Reference (${userRefCount}/3)`}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {userRefCount >= 3 
                            ? "Maximum 3 references reached. Remove one to add new" 
                            : "Add as reference (drag to reorder priority)"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyPrompt(item.prompt)}
                      data-testid={`button-copy-prompt-${item.id}`}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Prompt
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
