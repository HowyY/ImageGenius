import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StylePreset } from "@shared/schema";

export type EngineType = "nanobanana" | "seedream" | "nanopro" | "nanobanana-t2i" | "nanopro-t2i";

const ENGINE_OPTIONS: { value: EngineType; label: string }[] = [
  { value: "nanobanana", label: "NanoBanana Edit" },
  { value: "seedream", label: "SeeDream V4" },
  { value: "nanopro", label: "Nano Pro (2K/4K)" },
  { value: "nanobanana-t2i", label: "NanoBanana T2I (No Ref)" },
  { value: "nanopro-t2i", label: "Nano Pro T2I (2K, No Ref)" },
];

interface GenerationSettingsProps {
  selectedStyle: string;
  onStyleChange: (value: string) => void;
  selectedEngine: EngineType;
  onEngineChange: (value: EngineType) => void;
  styles?: StylePreset[];
  stylesLoading: boolean;
  className?: string;
}

export function GenerationSettings({
  selectedStyle,
  onStyleChange,
  selectedEngine,
  onEngineChange,
  styles,
  stylesLoading,
  className = "",
}: GenerationSettingsProps) {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="style-select" className="mb-2 block text-sm font-medium">
            Style Preset
          </Label>
          <Select
            value={selectedStyle}
            onValueChange={onStyleChange}
            disabled={stylesLoading}
          >
            <SelectTrigger id="style-select" data-testid="select-storyboard-style">
              <SelectValue placeholder={stylesLoading ? "Loading styles..." : "Select a style"} />
            </SelectTrigger>
            <SelectContent>
              {stylesLoading ? (
                <div className="p-2">
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                styles?.map((style) => (
                  <SelectItem key={style.id} value={style.id} data-testid={`option-storyboard-style-${style.id}`}>
                    {style.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="engine-select" className="mb-2 block text-sm font-medium">
            Engine
          </Label>
          <Select
            value={selectedEngine}
            onValueChange={(v) => onEngineChange(v as EngineType)}
          >
            <SelectTrigger id="engine-select" data-testid="select-storyboard-engine">
              <SelectValue placeholder="Select engine" />
            </SelectTrigger>
            <SelectContent>
              {ENGINE_OPTIONS.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value} 
                  data-testid={`option-engine-${option.value}`}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
