import { Check, FileText, Film, Headphones, LayoutGrid, ListTree, Settings, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const stages: Stage[] = [
  { id: "manage", label: "Manage", icon: Settings },
  { id: "outline", label: "Outline", icon: ListTree },
  { id: "script", label: "Script", icon: FileText },
  { id: "storyboard", label: "Storyboard", icon: LayoutGrid },
  { id: "audio", label: "Audio", icon: Headphones },
  { id: "video", label: "Video", icon: Film },
];

interface StageNavigationProps {
  currentStage?: string | null;
  stageStatus?: string | null;
  onStageClick?: (stageId: string) => void;
  className?: string;
}

export function StageNavigation({ 
  currentStage = "storyboard", 
  stageStatus,
  onStageClick,
  className 
}: StageNavigationProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStage) || 3;
  
  const getStageState = (stage: Stage, index: number) => {
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return stageStatus === "completed" ? "completed" : "current";
    return "upcoming";
  };

  return (
    <div className={cn("fixed bottom-0 left-0 right-0 bg-background border-t z-40", className)}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          {stages.map((stage, index) => {
            const state = getStageState(stage, index);
            const isCompleted = state === "completed";
            const isCurrent = state === "current";
            const isClickable = onStageClick && (isCompleted || isCurrent);
            
            return (
              <div key={stage.id} className="flex items-center">
                <button
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-1 rounded-md transition-colors",
                    isClickable && "cursor-pointer hover-elevate",
                    !isClickable && "cursor-default"
                  )}
                  onClick={() => isClickable && onStageClick?.(stage.id)}
                  disabled={!isClickable}
                  data-testid={`stage-${stage.id}`}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    isCompleted && "bg-green-500",
                    isCurrent && "bg-primary",
                    !isCompleted && !isCurrent && "bg-muted"
                  )}>
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <stage.icon className={cn(
                        "w-4 h-4",
                        isCurrent ? "text-primary-foreground" : "text-muted-foreground"
                      )} />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isCompleted && "text-green-500",
                    isCurrent && "text-primary",
                    !isCompleted && !isCurrent && "text-muted-foreground"
                  )}>
                    {stage.label}
                  </span>
                </button>
                
                {index < stages.length - 1 && (
                  <div className={cn(
                    "w-8 h-0.5 mx-1",
                    index < currentIndex ? "bg-green-500" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
