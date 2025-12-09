import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Image as ImageIcon, Package, Search, X, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import type { SelectAsset, InsertAsset, AssetReferenceImage, UpdateAsset } from "@shared/schema";
import { nanoid } from "nanoid";

const ASSETS_QUERY_KEY = "/api/assets";

export default function AssetEditor() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"background" | "prop">("background");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<SelectAsset | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<SelectAsset | null>(null);
  
  const [editForm, setEditForm] = useState({
    name: "",
    visualPrompt: "",
    referenceImages: [] as AssetReferenceImage[],
    tags: [] as string[],
    newTag: "",
    newImageUrl: "",
  });

  const { data: assets = [], isLoading } = useQuery<SelectAsset[]>({
    queryKey: [ASSETS_QUERY_KEY],
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: InsertAsset) => {
      return apiRequest("POST", ASSETS_QUERY_KEY, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSETS_QUERY_KEY] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Asset created",
        description: "The asset has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create asset.",
        variant: "destructive",
      });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAsset }) => {
      return apiRequest("PATCH", `${ASSETS_QUERY_KEY}/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSETS_QUERY_KEY] });
      toast({
        title: "Asset saved",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save asset.",
        variant: "destructive",
      });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `${ASSETS_QUERY_KEY}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ASSETS_QUERY_KEY] });
      if (selectedAsset && assetToDelete && selectedAsset.id === assetToDelete.id) {
        setSelectedAsset(null);
        resetForm();
      }
      setIsDeleteDialogOpen(false);
      setAssetToDelete(null);
      toast({
        title: "Asset deleted",
        description: "The asset has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete asset.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setEditForm({
      name: "",
      visualPrompt: "",
      referenceImages: [],
      tags: [],
      newTag: "",
      newImageUrl: "",
    });
  };

  const loadAssetToForm = useCallback((asset: SelectAsset) => {
    setSelectedAsset(asset);
    setEditForm({
      name: asset.name,
      visualPrompt: asset.visualPrompt || "",
      referenceImages: asset.referenceImages || [],
      tags: asset.tags || [],
      newTag: "",
      newImageUrl: "",
    });
  }, []);

  const handleCreateNew = () => {
    resetForm();
    setSelectedAsset(null);
    setIsCreateDialogOpen(true);
  };

  const handleSaveCreate = () => {
    if (!editForm.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the asset.",
        variant: "destructive",
      });
      return;
    }

    const prefix = activeTab === "background" ? "bg" : "prop";
    createAssetMutation.mutate({
      id: `${prefix}_${nanoid(10)}`,
      type: activeTab,
      name: editForm.name.trim(),
      visualPrompt: editForm.visualPrompt || "",
      referenceImages: editForm.referenceImages,
      tags: editForm.tags,
    });
  };

  const handleSaveEdit = () => {
    if (!selectedAsset) return;
    if (!editForm.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the asset.",
        variant: "destructive",
      });
      return;
    }

    updateAssetMutation.mutate({
      id: selectedAsset.id,
      data: {
        name: editForm.name.trim(),
        visualPrompt: editForm.visualPrompt || undefined,
        referenceImages: editForm.referenceImages,
        tags: editForm.tags,
      },
    });
  };

  const handleAddTag = () => {
    const tag = editForm.newTag.trim();
    if (tag && !editForm.tags.includes(tag)) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
        newTag: "",
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove),
    }));
  };

  const handleAddImage = () => {
    const url = editForm.newImageUrl.trim();
    if (url && !editForm.referenceImages.some(img => img.url === url)) {
      setEditForm(prev => ({
        ...prev,
        referenceImages: [...prev.referenceImages, { url }],
        newImageUrl: "",
      }));
    }
  };

  const handleRemoveImage = (urlToRemove: string) => {
    setEditForm(prev => ({
      ...prev,
      referenceImages: prev.referenceImages.filter(img => img.url !== urlToRemove),
    }));
  };

  const handleDeleteClick = (asset: SelectAsset) => {
    setAssetToDelete(asset);
    setIsDeleteDialogOpen(true);
  };

  const filteredAssets = assets.filter(asset => {
    if (asset.type !== activeTab) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      asset.name.toLowerCase().includes(query) ||
      asset.tags?.some(t => t.toLowerCase().includes(query))
    );
  });

  return (
    <div className="h-[calc(100vh-3.5rem)] mt-14 flex" data-testid="asset-editor-page">
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "background" | "prop")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="background" data-testid="tab-backgrounds">
                <ImageIcon className="w-4 h-4 mr-1" />
                Backgrounds
              </TabsTrigger>
              <TabsTrigger value="prop" data-testid="tab-props">
                <Package className="w-4 h-4 mr-1" />
                Props
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="p-4 border-b">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search-assets"
              />
            </div>
            <Button onClick={handleCreateNew} size="icon" data-testid="button-create-asset">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? "No matching assets found" : `No ${activeTab}s yet`}
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className={`p-3 rounded-md cursor-pointer hover-elevate ${
                    selectedAsset?.id === asset.id ? "bg-accent" : ""
                  }`}
                  onClick={() => loadAssetToForm(asset)}
                  data-testid={`asset-item-${asset.id}`}
                >
                  <div className="flex items-center gap-2">
                    {asset.referenceImages && asset.referenceImages.length > 0 ? (
                      <ImageWithFallback
                        src={asset.referenceImages[0].url}
                        alt={asset.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        {activeTab === "background" ? (
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{asset.name}</div>
                      {asset.tags && asset.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {asset.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {asset.tags.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{asset.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(asset);
                      }}
                      data-testid={`button-delete-asset-${asset.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 p-6">
        {selectedAsset ? (
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Edit {activeTab === "background" ? "Background" : "Prop"}</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAsset(null);
                    resetForm();
                  }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateAssetMutation.isPending}
                  data-testid="button-save-asset"
                >
                  {updateAssetMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Asset name..."
                  data-testid="input-asset-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visualPrompt">Visual Prompt</Label>
                <Textarea
                  id="visualPrompt"
                  value={editForm.visualPrompt}
                  onChange={(e) => setEditForm(prev => ({ ...prev, visualPrompt: e.target.value }))}
                  placeholder="Describe the visual appearance..."
                  className="min-h-[120px]"
                  data-testid="input-asset-prompt"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={editForm.newTag}
                    onChange={(e) => setEditForm(prev => ({ ...prev, newTag: e.target.value }))}
                    placeholder="Add a tag..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    data-testid="input-new-tag"
                  />
                  <Button variant="outline" onClick={handleAddTag} data-testid="button-add-tag">
                    Add
                  </Button>
                </div>
                {editForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editForm.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Reference Images</Label>
                <div className="flex gap-2">
                  <Input
                    value={editForm.newImageUrl}
                    onChange={(e) => setEditForm(prev => ({ ...prev, newImageUrl: e.target.value }))}
                    placeholder="Image URL..."
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddImage())}
                    data-testid="input-new-image"
                  />
                  <Button variant="outline" onClick={handleAddImage} data-testid="button-add-image">
                    Add
                  </Button>
                </div>
                {editForm.referenceImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {editForm.referenceImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <ImageWithFallback
                          src={img.url}
                          alt={`Reference ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-md"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(img.url)}
                          data-testid={`button-remove-image-${index}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select an asset to edit or create a new one</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create New {activeTab === "background" ? "Background" : "Prop"}
            </DialogTitle>
            <DialogDescription>
              Add a new {activeTab} asset to use in your compositions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Asset name..."
                data-testid="dialog-input-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-prompt">Visual Prompt (optional)</Label>
              <Textarea
                id="create-prompt"
                value={editForm.visualPrompt}
                onChange={(e) => setEditForm(prev => ({ ...prev, visualPrompt: e.target.value }))}
                placeholder="Describe the visual appearance..."
                data-testid="dialog-input-prompt"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              data-testid="dialog-button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCreate}
              disabled={createAssetMutation.isPending}
              data-testid="dialog-button-create"
            >
              {createAssetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{assetToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="dialog-button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => assetToDelete && deleteAssetMutation.mutate(assetToDelete.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="dialog-button-confirm-delete"
            >
              {deleteAssetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
