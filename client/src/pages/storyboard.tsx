import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Image as ImageIcon, 
  Play, 
  RefreshCw, 
  Plus,
  Grid3X3,
  LayoutGrid
} from "lucide-react";
import type { SelectGenerationHistory } from "@shared/schema";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { setPrompt, setEngine, setSelectedStyleId } from "@/lib/generationState";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ViewMode = "compact" | "comfortable";

export default function Storyboard() {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>("comfortable");
  
  const { data: history, isLoading, refetch } = useQuery<SelectGenerationHistory[]>({
    queryKey: ["/api/history"],
    refetchInterval: 30000,
  });

  const handleImageClick = (item: SelectGenerationHistory) => {
    setPrompt(item.prompt);
    setEngine(item.engine);
    setSelectedStyleId(item.styleId);
    navigate("/");
  };

  const handleIterateClick = (e: React.MouseEvent, item: SelectGenerationHistory) => {
    e.stopPropagation();
    setPrompt(item.prompt);
    setEngine(item.engine);
    setSelectedStyleId(item.styleId);
    navigate("/");
  };

  const gridClasses = viewMode === "compact" 
    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
    : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-storyboard-title">
              Storyboard
            </h1>
            <p className="text-muted-foreground" data-testid="text-storyboard-subtitle">
              Visual overview of your generated images. Click any image to iterate.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  data-testid="button-refresh-storyboard"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            
            <div className="flex border rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "compact" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("compact")}
                    className="rounded-r-none"
                    data-testid="button-view-compact"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Compact View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "comfortable" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("comfortable")}
                    className="rounded-l-none"
                    data-testid="button-view-comfortable"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Comfortable View</TooltipContent>
              </Tooltip>
            </div>
            
            <Button
              onClick={() => navigate("/")}
              data-testid="button-new-generation"
            >
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className={`grid ${gridClasses}`}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className="relative">
                <Skeleton className="aspect-square w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-title">
                No images in your storyboard
              </h3>
              <p className="text-muted-foreground mb-4" data-testid="text-empty-description">
                Start generating images to build your storyboard
              </p>
              <Button onClick={() => navigate("/")} data-testid="button-start-generating">
                <Plus className="w-4 h-4 mr-2" />
                Generate First Image
              </Button>
            </div>
          </Card>
        ) : (
          <div className={`grid ${gridClasses}`}>
            {history.map((item, index) => (
              <div
                key={item.id}
                className="group relative cursor-pointer"
                onClick={() => handleImageClick(item)}
                data-testid={`storyboard-item-${item.id}`}
              >
                <div className="relative aspect-square bg-muted rounded-md overflow-hidden">
                  <ImageWithFallback
                    src={item.generatedImageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    data-testid={`img-storyboard-${item.id}`}
                    loading="lazy"
                    fallbackText="Failed to load"
                  />
                  
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-xs"
                    data-testid={`badge-sequence-${item.id}`}
                  >
                    #{history.length - index}
                  </Badge>
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      onClick={(e) => handleIterateClick(e, item)}
                      className="shadow-lg"
                      data-testid={`button-iterate-${item.id}`}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Iterate
                    </Button>
                  </div>
                  
                  {viewMode === "comfortable" && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs line-clamp-2">{item.prompt}</p>
                    </div>
                  )}
                </div>
                
                {viewMode === "comfortable" && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {item.styleLabel}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {item.engine}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {history && history.length > 0 && (
          <div className="mt-8 text-center text-muted-foreground text-sm" data-testid="text-image-count">
            {history.length} image{history.length !== 1 ? 's' : ''} in storyboard
          </div>
        )}
      </div>
    </div>
  );
}
