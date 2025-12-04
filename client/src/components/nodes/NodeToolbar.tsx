import { Panel } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { User, Palette, RotateCcw, PersonStanding, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NodeToolbarProps {
  onAddNode: (type: string) => void;
}

const nodeTypes = [
  { type: "character", icon: User, label: "Character", color: "text-blue-500" },
  { type: "style", icon: Palette, label: "Style", color: "text-purple-500" },
  { type: "angle", icon: RotateCcw, label: "Angle", color: "text-green-500" },
  { type: "pose", icon: PersonStanding, label: "Pose", color: "text-orange-500" },
  { type: "output", icon: Sparkles, label: "Output", color: "text-amber-500" },
];

export function NodeToolbar({ onAddNode }: NodeToolbarProps) {
  return (
    <Panel position="top-right" className="flex gap-1 bg-card border rounded-md p-1">
      {nodeTypes.map(({ type, icon: Icon, label, color }) => (
        <Tooltip key={type}>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onAddNode(type)}
              data-testid={`button-add-${type}-node`}
            >
              <Icon className={`w-4 h-4 ${color}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Add {label} Node</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </Panel>
  );
}
