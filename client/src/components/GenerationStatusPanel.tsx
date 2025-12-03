import { useState, useEffect } from "react";
import { useGeneration, type GenerationTask, type GenerationStage } from "@/contexts/GenerationContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronUp, 
  X, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Image as ImageIcon,
  Trash2,
  Clock,
  Sparkles,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatElapsedTime(startedAt: number): string {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${seconds}s`;
}

function getStageInfo(stage: GenerationStage): { label: string; icon: typeof Clock } {
  switch (stage) {
    case "starting":
      return { label: "Starting", icon: Clock };
    case "processing":
      return { label: "Generating with AI", icon: Sparkles };
    case "receiving":
      return { label: "Receiving image", icon: Download };
    default:
      return { label: "Processing", icon: Loader2 };
  }
}

function TaskItem({ task, onClear }: { task: GenerationTask; onClear: () => void }) {
  const isGenerating = task.status === "generating";
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const stageInfo = isGenerating ? getStageInfo(task.stage) : null;
  const StageIcon = stageInfo?.icon || Loader2;

  return (
    <div 
      className="p-3 border-b last:border-b-0 border-border/50"
      data-testid={`task-item-${task.id}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {isGenerating && <StageIcon className="w-4 h-4 animate-spin text-primary" />}
          {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {isFailed && <XCircle className="w-4 h-4 text-destructive" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {task.sceneName || `Scene ${task.sceneId || "Image"}`}
            </span>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {task.engine}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {task.prompt.slice(0, 50)}{task.prompt.length > 50 ? "..." : ""}
          </p>
          
          {isGenerating && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <Clock className="w-3 h-3" />
                <span className="font-medium">{formatElapsedTime(task.startedAt)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {stageInfo?.label}
              </span>
            </div>
          )}
          
          {isCompleted && task.imageUrl && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                <img 
                  src={task.imageUrl} 
                  alt="Generated" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-green-600 dark:text-green-400">
                  Completed
                </span>
                {task.completedAt && (
                  <span className="text-xs text-muted-foreground">
                    {formatElapsedTime(task.startedAt)} total
                  </span>
                )}
              </div>
            </div>
          )}
          
          {isFailed && (
            <p className="text-xs text-destructive mt-1">
              {task.error || "Generation failed"}
            </p>
          )}
        </div>
        
        <Button
          size="icon"
          variant="ghost"
          className="flex-shrink-0 h-6 w-6"
          onClick={onClear}
          data-testid={`button-clear-task-${task.id}`}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export function GenerationStatusPanel() {
  const { tasks, activeTaskCount, clearCompletedTasks, clearTask } = useGeneration();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  if (tasks.length === 0) {
    return null;
  }

  const completedCount = tasks.filter(t => t.status === "completed").length;
  const failedCount = tasks.filter(t => t.status === "failed").length;

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50"
        data-testid="generation-status-minimized"
      >
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full shadow-lg gap-2"
          data-testid="button-expand-status"
        >
          {activeTaskCount > 0 ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{activeTaskCount} generating</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              <span>{tasks.length} tasks</span>
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card 
      className="fixed bottom-4 right-4 z-50 w-80 shadow-lg overflow-hidden"
      data-testid="generation-status-panel"
    >
      <div 
        className="flex items-center justify-between gap-2 p-3 bg-muted/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="status-panel-header"
      >
        <div className="flex items-center gap-2">
          {activeTaskCount > 0 && (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          )}
          <span className="font-medium text-sm">
            Generation Tasks
          </span>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          {completedCount > 0 && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                clearCompletedTasks();
              }}
              title="Clear completed"
              data-testid="button-clear-completed"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            data-testid="button-minimize-panel"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div 
          className={cn(
            "max-h-80 overflow-y-auto",
            tasks.length === 0 && "hidden"
          )}
          data-testid="status-panel-content"
        >
          {tasks.map(task => (
            <TaskItem 
              key={task.id} 
              task={task} 
              onClear={() => clearTask(task.id)}
            />
          ))}
        </div>
      )}
      
      {isExpanded && (
        <div className="p-2 bg-muted/30 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {activeTaskCount > 0 && `${activeTaskCount} generating`}
            {activeTaskCount > 0 && completedCount > 0 && " | "}
            {completedCount > 0 && `${completedCount} completed`}
            {(activeTaskCount > 0 || completedCount > 0) && failedCount > 0 && " | "}
            {failedCount > 0 && `${failedCount} failed`}
          </span>
        </div>
      )}
    </Card>
  );
}
