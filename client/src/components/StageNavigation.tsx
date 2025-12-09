import { FileText, Film, Headphones, LayoutGrid, ListTree, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";

interface Stage {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const stages: Stage[] = [
  { id: "project", label: "Project", icon: Settings, path: "/projects" },
  { id: "outline", label: "Outline", icon: ListTree, path: "/outline" },
  { id: "script", label: "Script", icon: FileText, path: "/script" },
  { id: "storyboard", label: "Storyboard", icon: LayoutGrid, path: "/storyboard" },
  { id: "audio", label: "Audio", icon: Headphones, path: "/audio" },
  { id: "video", label: "Video", icon: Film, path: "/video" },
];

interface StageNavigationProps {
  className?: string;
}

export function StageNavigation({ className }: StageNavigationProps) {
  const [location] = useLocation();
  
  const getCurrentStageIndex = () => {
    if (location === "/" || location === "/projects") return 0;
    const index = stages.findIndex(s => s.path !== "/projects" && location.startsWith(s.path));
    return index >= 0 ? index : 0;
  };
  
  const currentIndex = getCurrentStageIndex();

  return (
    <div className={cn("fixed bottom-0 left-0 right-0 bg-background border-t z-40", className)}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          {stages.map((stage, index) => {
            const isActive = index === currentIndex;
            
            return (
              <div key={stage.id} className="flex items-center">
                <Link
                  href={stage.path}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-1 rounded-md transition-colors cursor-pointer hover-elevate"
                  )}
                  data-testid={`stage-${stage.id}`}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    isActive && "bg-primary",
                    !isActive && "bg-muted"
                  )}>
                    <stage.icon className={cn(
                      "w-4 h-4",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isActive && "text-primary",
                    !isActive && "text-muted-foreground"
                  )}>
                    {stage.label}
                  </span>
                </Link>
                
                {index < stages.length - 1 && (
                  <div className="w-8 h-0.5 mx-1 bg-muted" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
