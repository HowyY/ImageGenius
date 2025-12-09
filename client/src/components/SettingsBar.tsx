import { useState } from "react";
import { ChevronDown, ChevronUp, Settings, Palette } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type EngineType = "nanobanana" | "seedream" | "nanopro" | "nanobanana-t2i" | "nanopro-t2i";

const ENGINE_OPTIONS: { value: EngineType; label: string }[] = [
  { value: "nanobanana", label: "NanoBanana Edit" },
  { value: "seedream", label: "SeeDream V4" },
  { value: "nanopro", label: "Nano Pro (2K/4K)" },
  { value: "nanobanana-t2i", label: "NanoBanana T2I (No Ref)" },
  { value: "nanopro-t2i", label: "Nano Pro T2I (2K, No Ref)" },
];

interface StyleOption {
  id: string;
  label: string;
  description: string;
  engines: string[];
  basePrompt?: string;
  referenceImageUrl?: string;
}

interface SettingsBarProps {
  selectedStyle: string;
  onStyleChange: (value: string) => void;
  selectedEngine: EngineType;
  onEngineChange: (value: EngineType) => void;
  styles?: StyleOption[];
  stylesLoading: boolean;
  disabled?: boolean;
}

export function SettingsBar({
  selectedStyle,
  onStyleChange,
  selectedEngine,
  onEngineChange,
  styles,
  stylesLoading,
  disabled = false,
}: SettingsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentStyle = styles?.find((s) => s.id === selectedStyle);
  const currentEngine = ENGINE_OPTIONS.find((e) => e.value === selectedEngine);

  const handleOpenChange = (open: boolean) => {
    if (disabled) return;
    setIsExpanded(open);
  };

  return (
    <Collapsible open={isExpanded && !disabled} onOpenChange={handleOpenChange}>
      <Card className="overflow-visible" data-testid="card-settings-bar">
        <CollapsibleTrigger asChild>
          <button
            className={`w-full p-3 flex items-center justify-between gap-4 rounded-md transition-colors ${
              disabled ? "opacity-60 cursor-not-allowed" : "hover-elevate active-elevate-2"
            }`}
            data-testid="button-toggle-settings"
            disabled={disabled}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              
              <div className="flex items-center gap-4 min-w-0 flex-wrap">
                {stylesLoading ? (
                  <Skeleton className="h-5 w-32" />
                ) : (
                  <>
                    {currentStyle?.referenceImageUrl && (
                      <img
                        src={currentStyle.referenceImageUrl}
                        alt="Style preview"
                        className="w-8 h-8 rounded-md object-cover shrink-0"
                        data-testid="img-settings-style-preview"
                      />
                    )}
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-sm font-medium truncate" data-testid="text-settings-style-name">
                        {currentStyle?.label || "No style selected"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate" data-testid="text-settings-engine-name">
                        {currentEngine?.label || "No engine"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {isExpanded ? "Close" : "Settings"}
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" data-testid="icon-settings-collapse" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" data-testid="icon-settings-expand" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t space-y-4" data-testid="panel-settings-expanded">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="settings-style-select" className="mb-2 block text-sm font-medium">
                  Style Preset
                </Label>
                <Select
                  value={selectedStyle}
                  onValueChange={onStyleChange}
                  disabled={stylesLoading || disabled}
                >
                  <SelectTrigger id="settings-style-select" data-testid="select-settings-style">
                    <SelectValue placeholder={stylesLoading ? "Loading styles..." : "Select a style"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stylesLoading ? (
                      <div className="p-2">
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : (
                      styles?.map((style) => (
                        <SelectItem 
                          key={style.id} 
                          value={style.id} 
                          data-testid={`option-settings-style-${style.id}`}
                        >
                          {style.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="settings-engine-select" className="mb-2 block text-sm font-medium">
                  Engine
                </Label>
                <Select
                  value={selectedEngine}
                  onValueChange={(v) => onEngineChange(v as EngineType)}
                  disabled={disabled}
                >
                  <SelectTrigger id="settings-engine-select" data-testid="select-settings-engine">
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENGINE_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        data-testid={`option-settings-engine-${option.value}`}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {currentStyle?.referenceImageUrl && (
              <div>
                <Label className="mb-2 block text-sm font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Style Reference
                </Label>
                <div className="flex flex-wrap gap-2">
                  <div 
                    className="relative w-16 h-16 rounded-md overflow-hidden border border-border"
                    data-testid="img-settings-style-reference"
                  >
                    <img
                      src={currentStyle.referenceImageUrl}
                      alt="Style reference"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
