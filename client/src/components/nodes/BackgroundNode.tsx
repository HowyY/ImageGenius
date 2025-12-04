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
import { Image, ChevronDown, Plus, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { SelectAsset } from "@shared/schema";

interface BackgroundNodeData {
  assetId?: string;
  name?: string;
  visualPrompt?: string;
  onChange?: (data: { assetId?: string; name?: string; visualPrompt?: string }) => void;
}

function BackgroundNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as unknown as BackgroundNodeData;
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetPrompt, setNewAssetPrompt] = useState("");

  const { data: assets = [] } = useQuery<SelectAsset[]>({
    queryKey: ["/api/assets"],
  });

  const backgroundAssets = assets.filter((a) => a.type === "background");

  const createAssetMutation = useMutation({
    mutationFn: async (data: { name: string; visualPrompt: string }) => {
      const assetId = `bg_${Date.now()}`;
      return apiRequest("POST", "/api/assets", {
        id: assetId,
        type: "background",
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

  const handleSelectAsset = useCallback(
    (asset: SelectAsset) => {
      nodeData.onChange?.({
        assetId: asset.id,
        name: asset.name,
        visualPrompt: asset.visualPrompt || "",
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

  const getAssetThumbnail = useCallback((asset: SelectAsset) => {
    const refs = asset.referenceImages || [];
    if (refs.length > 0 && refs[0].url) {
      return refs[0].url;
    }
    return null;
  }, []);

  const selectedAsset = backgroundAssets.find((a) => a.id === nodeData.assetId);

  return (
    <>
      <Card className="w-[280px] shadow-lg border-2 border-emerald-500/50 bg-card" data-testid={`node-background-${id}`}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10">
              <Image className="w-4 h-4 text-emerald-500" />
            </div>
            Background
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Select Background</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-9 text-sm"
                  data-testid="button-select-background"
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
                        <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center">
                          <Image className="w-3 h-3 text-emerald-500" />
                        </div>
                      )}
                      <span className="truncate">{selectedAsset.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select background...</span>
                  )}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search backgrounds..." />
                  <CommandList>
                    <CommandEmpty>No backgrounds found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreateNew}
                        className="text-emerald-600 dark:text-emerald-400"
                        data-testid="option-create-background"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Background
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Backgrounds">
                      {backgroundAssets.map((asset) => (
                        <CommandItem
                          key={asset.id}
                          value={asset.name}
                          onSelect={() => handleSelectAsset(asset)}
                          data-testid={`option-background-${asset.id}`}
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
                              <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center">
                                <Image className="w-3 h-3 text-emerald-500" />
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
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Visual Description</Label>
              <div className="text-xs text-foreground bg-muted/50 rounded-md p-2 max-h-[60px] overflow-y-auto">
                {nodeData.visualPrompt || <span className="text-muted-foreground italic">No description</span>}
              </div>
            </div>
          )}
        </CardContent>
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-emerald-500"
        />
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Background</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                placeholder="Background name..."
                data-testid="input-new-background-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Visual Description</Label>
              <Textarea
                value={newAssetPrompt}
                onChange={(e) => setNewAssetPrompt(e.target.value)}
                placeholder="Describe the background..."
                className="min-h-[100px]"
                data-testid="input-new-background-prompt"
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
              data-testid="button-create-background-submit"
            >
              {createAssetMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const BackgroundNode = memo(BackgroundNodeComponent);
