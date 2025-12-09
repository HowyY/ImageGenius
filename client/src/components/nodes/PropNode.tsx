import { memo, useCallback, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ChevronDown, Plus, Check, Sparkles, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { SelectAsset, SelectStyle } from "@shared/schema";

interface PropNodeData {
  assetId?: string;
  name?: string;
  visualPrompt?: string;
  styleId?: string;
  generatedImage?: string;
  onChange?: (data: { assetId?: string; name?: string; visualPrompt?: string; styleId?: string; generatedImage?: string }) => void;
}

function PropNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as unknown as PropNodeData;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetPrompt, setNewAssetPrompt] = useState("");

  const { data: assets = [] } = useQuery<SelectAsset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: styles = [] } = useQuery<SelectStyle[]>({
    queryKey: ["/api/styles"],
  });

  const visibleStyles = styles.filter((s) => !s.isHidden);
  const propAssets = assets.filter((a) => a.type === "prop");

  const createAssetMutation = useMutation({
    mutationFn: async (data: { name: string; visualPrompt: string }) => {
      const assetId = `prop_${Date.now()}`;
      return apiRequest("POST", "/api/assets", {
        id: assetId,
        type: "prop",
        name: data.name,
        visualPrompt: data.visualPrompt,
        referenceImages: [],
        tags: [],
      });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      const newAsset = await response.json();
      nodeData.onChange?.({
        assetId: newAsset.id,
        name: newAsset.name,
        visualPrompt: newAsset.visualPrompt,
      });
      setCreateDialogOpen(false);
      setNewAssetName("");
      setNewAssetPrompt("");
    },
  });

  const generateMutation = useMutation({
    mutationFn: async ({ prompt, styleId }: { prompt: string; styleId: string }) => {
      const style = styles.find((s) => s.id === styleId);
      const engine = style?.engines?.[0] || "nano-banana";
      
      const response = await apiRequest("POST", "/api/generate", {
        prompt,
        styleId,
        engine,
        userReferenceImages: [],
      });
      return response.json();
    },
    onSuccess: async (result) => {
      if (result.imageUrl && nodeData.assetId) {
        const asset = propAssets.find((a) => a.id === nodeData.assetId);
        if (asset) {
          const existingRefs = asset.referenceImages || [];
          const newRef = {
            url: result.imageUrl,
            styleId: nodeData.styleId,
          };
          
          await apiRequest("PATCH", `/api/assets/${nodeData.assetId}`, {
            referenceImages: [...existingRefs, newRef],
          });
          
          await queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
          
          nodeData.onChange?.({
            ...nodeData,
            generatedImage: result.imageUrl,
          });
          
          toast({
            title: "Prop Generated",
            description: "Prop image has been saved to asset references.",
          });
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate image",
        variant: "destructive",
      });
    },
  });

  const handleSelectAsset = useCallback(
    (asset: SelectAsset) => {
      const thumbnail = getAssetThumbnail(asset);
      nodeData.onChange?.({
        assetId: asset.id,
        name: asset.name,
        visualPrompt: asset.visualPrompt || "",
        generatedImage: thumbnail || undefined,
      });
      setOpen(false);
    },
    [nodeData]
  );

  const handleCreateNew = useCallback(() => {
    setOpen(false);
    setCreateDialogOpen(true);
  }, []);

  const handleCreateSubmit = useCallback(() => {
    if (!newAssetName.trim()) return;
    createAssetMutation.mutate({
      name: newAssetName.trim(),
      visualPrompt: newAssetPrompt.trim(),
    });
  }, [newAssetName, newAssetPrompt, createAssetMutation]);

  const handleStyleChange = useCallback(
    (styleId: string) => {
      nodeData.onChange?.({
        ...nodeData,
        styleId,
      });
    },
    [nodeData]
  );

  const handleGenerate = useCallback(() => {
    if (!nodeData.assetId) {
      toast({
        title: "Cannot Generate",
        description: "Please select a prop first.",
        variant: "destructive",
      });
      return;
    }
    
    if (!nodeData.visualPrompt) {
      toast({
        title: "Cannot Generate",
        description: "Prop has no visual description.",
        variant: "destructive",
      });
      return;
    }
    
    if (!nodeData.styleId) {
      toast({
        title: "Cannot Generate",
        description: "Please select a style first.",
        variant: "destructive",
      });
      return;
    }
    
    generateMutation.mutate({
      prompt: `Object/prop: ${nodeData.visualPrompt}`,
      styleId: nodeData.styleId,
    });
  }, [nodeData, generateMutation, toast]);

  const getAssetThumbnail = useCallback((asset: SelectAsset) => {
    const refs = asset.referenceImages || [];
    if (refs.length > 0 && refs[0].url) {
      return refs[0].url;
    }
    return null;
  }, []);

  const selectedAsset = propAssets.find((a) => a.id === nodeData.assetId);
  const displayImage = nodeData.generatedImage || (selectedAsset ? getAssetThumbnail(selectedAsset) : null);

  return (
    <>
      <Card className="w-[280px] shadow-lg border-2 border-amber-500/50 bg-card" data-testid={`node-prop-${id}`}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10">
              <Package className="w-4 h-4 text-amber-500" />
            </div>
            Prop
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Select Prop</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-9 text-sm"
                  data-testid="button-select-prop"
                >
                  {selectedAsset ? (
                    <div className="flex items-center gap-2">
                      {getAssetThumbnail(selectedAsset) ? (
                        <div className="w-5 h-5 rounded overflow-hidden bg-muted">
                          <img
                            src={getAssetThumbnail(selectedAsset)!}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center">
                          <Package className="w-3 h-3 text-amber-500" />
                        </div>
                      )}
                      <span className="truncate">{selectedAsset.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select prop...</span>
                  )}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search props..." />
                  <CommandList>
                    <CommandEmpty>No props found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreateNew}
                        className="text-amber-600 dark:text-amber-400"
                        data-testid="option-create-prop"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Prop
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Props">
                      {propAssets.map((asset) => (
                        <CommandItem
                          key={asset.id}
                          value={asset.name}
                          onSelect={() => handleSelectAsset(asset)}
                          data-testid={`option-prop-${asset.id}`}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {getAssetThumbnail(asset) ? (
                              <div className="w-6 h-6 rounded overflow-hidden bg-muted">
                                <img
                                  src={getAssetThumbnail(asset)!}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
                                <Package className="w-3 h-3 text-amber-500" />
                              </div>
                            )}
                            <span className="truncate">{asset.name}</span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              nodeData.assetId === asset.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedAsset && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Style</Label>
                <Select value={nodeData.styleId || ""} onValueChange={handleStyleChange}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-prop-style">
                    <SelectValue placeholder="Select style..." />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleStyles.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Visual Description</Label>
                <div className="text-xs text-foreground bg-muted/50 rounded-md p-2 max-h-[60px] overflow-y-auto">
                  {nodeData.visualPrompt || <span className="text-muted-foreground italic">No description</span>}
                </div>
              </div>

              {displayImage && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Preview</Label>
                  <div className="rounded-md overflow-hidden border bg-muted aspect-square">
                    <img
                      src={displayImage}
                      alt={nodeData.name || "Prop"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <Button
                size="sm"
                className="w-full"
                onClick={handleGenerate}
                disabled={!nodeData.assetId || !nodeData.visualPrompt || !nodeData.styleId || generateMutation.isPending}
                data-testid="button-generate-prop"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-amber-500"
        />
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Prop</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="Prop name..."
                data-testid="input-new-prop-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Visual Description</Label>
              <Textarea
                value={newAssetPrompt}
                onChange={(e) => setNewAssetPrompt(e.target.value)}
                placeholder="Describe the prop..."
                className="min-h-[100px]"
                data-testid="input-new-prop-prompt"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={!newAssetName.trim() || createAssetMutation.isPending}
              data-testid="button-create-prop-submit"
            >
              {createAssetMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const PropNode = memo(PropNodeComponent);
