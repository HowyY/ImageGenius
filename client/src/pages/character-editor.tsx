import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Plus, Trash2, User, Search, X, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { SelectCharacter, InsertCharacter, UpdateCharacter } from "@shared/schema";

export default function CharacterEditor() {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewCharacterDialog, setShowNewCharacterDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterDescription, setNewCharacterDescription] = useState("");
  const [editedCharacter, setEditedCharacter] = useState<Partial<UpdateCharacter>>({});
  const [newImageUrl, setNewImageUrl] = useState("");
  const { toast } = useToast();

  const { data: characters = [], isLoading } = useQuery<SelectCharacter[]>({
    queryKey: ["/api/characters"],
  });

  const createCharacterMutation = useMutation({
    mutationFn: async (data: InsertCharacter) => {
      const res = await apiRequest("POST", "/api/characters", data);
      return res.json();
    },
    onSuccess: (newChar) => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      setSelectedCharacterId(newChar.id);
      toast({
        title: "Success",
        description: "Character created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCharacterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCharacter }) => {
      const res = await apiRequest("PATCH", `/api/characters/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      toast({
        title: "Success",
        description: "Character updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCharacterMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/characters/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      setSelectedCharacterId("");
      setShowDeleteDialog(false);
      toast({
        title: "Success",
        description: "Character deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateCharacter = () => {
    if (!newCharacterName.trim()) {
      toast({
        title: "Error",
        description: "Character name is required",
        variant: "destructive",
      });
      return;
    }

    const id = `char_${Date.now()}`;
    createCharacterMutation.mutate({
      id,
      name: newCharacterName.trim(),
      description: newCharacterDescription.trim(),
      appearance: "",
      features: "",
      referenceImageUrls: [],
    });

    setShowNewCharacterDialog(false);
    setNewCharacterName("");
    setNewCharacterDescription("");
  };

  const handleSaveCharacter = () => {
    if (!selectedCharacter) return;

    const updates: UpdateCharacter = {};
    if (editedCharacter.name !== undefined) updates.name = editedCharacter.name;
    if (editedCharacter.description !== undefined) updates.description = editedCharacter.description;
    if (editedCharacter.appearance !== undefined) updates.appearance = editedCharacter.appearance;
    if (editedCharacter.features !== undefined) updates.features = editedCharacter.features;
    if (editedCharacter.referenceImageUrls !== undefined) updates.referenceImageUrls = editedCharacter.referenceImageUrls;

    if (Object.keys(updates).length === 0) {
      toast({
        title: "No changes",
        description: "No changes to save",
      });
      return;
    }

    updateCharacterMutation.mutate({
      id: selectedCharacter.id,
      data: updates,
    });
    setEditedCharacter({});
  };

  const handleDeleteCharacter = () => {
    if (!selectedCharacter) return;
    deleteCharacterMutation.mutate(selectedCharacter.id);
  };

  const handleAddReferenceImage = () => {
    if (!newImageUrl.trim()) return;
    
    const currentImages = editedCharacter.referenceImageUrls ?? selectedCharacter?.referenceImageUrls ?? [];
    const updatedImages = [...currentImages, newImageUrl.trim()];
    
    setEditedCharacter({ ...editedCharacter, referenceImageUrls: updatedImages });
    setNewImageUrl("");
  };

  const handleRemoveReferenceImage = (index: number) => {
    const currentImages = editedCharacter.referenceImageUrls ?? selectedCharacter?.referenceImageUrls ?? [];
    const updatedImages = currentImages.filter((_, i) => i !== index);
    setEditedCharacter({ ...editedCharacter, referenceImageUrls: updatedImages });
  };

  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (char.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
  const currentReferenceImages = editedCharacter.referenceImageUrls ?? selectedCharacter?.referenceImageUrls ?? [];

  useEffect(() => {
    setEditedCharacter({});
  }, [selectedCharacterId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Character Editor</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Create and manage characters for your storyboards
          </p>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel - Character List */}
          <div className="col-span-3">
            <Card className="p-4 h-[calc(100vh-180px)] flex flex-col">
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-search-characters"
                    placeholder="Search characters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  data-testid="button-new-character"
                  onClick={() => setShowNewCharacterDialog(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Character
                </Button>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 rounded-md">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredCharacters.length === 0 ? (
                  <div 
                    className="text-center py-8 text-muted-foreground text-sm"
                    data-testid="text-empty-state"
                  >
                    {searchQuery ? "No characters match your search" : "No characters yet. Create your first character!"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCharacters.map((char) => (
                      <div
                        key={char.id}
                        data-testid={`card-character-${char.id}`}
                        onClick={() => setSelectedCharacterId(char.id)}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${
                          selectedCharacterId === char.id
                            ? "bg-primary/10 border border-primary/30"
                            : "hover-elevate"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={char.referenceImageUrls?.[0]} />
                            <AvatarFallback>
                              {char.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{char.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {char.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>

          {/* Center Panel - Character Details */}
          <div className="col-span-5">
            <Card className="p-4 h-[calc(100vh-180px)] overflow-y-auto">
              {selectedCharacter ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold truncate" data-testid="text-character-name">
                      {selectedCharacter.name}
                    </h2>
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      onClick={() => setShowDeleteDialog(true)}
                      data-testid="button-delete-character"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label htmlFor="char-edit-name">Character Name</Label>
                    <Input 
                      id="char-edit-name"
                      data-testid="input-character-name"
                      value={editedCharacter.name ?? selectedCharacter.name}
                      onChange={(e) => setEditedCharacter({ ...editedCharacter, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="char-edit-description">Description</Label>
                    <Input 
                      id="char-edit-description"
                      data-testid="input-character-description"
                      value={editedCharacter.description ?? selectedCharacter.description ?? ""}
                      onChange={(e) => setEditedCharacter({ ...editedCharacter, description: e.target.value })}
                      placeholder="Brief character description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="char-edit-appearance">Appearance Details</Label>
                    <Textarea
                      id="char-edit-appearance"
                      data-testid="input-character-appearance"
                      value={editedCharacter.appearance ?? selectedCharacter.appearance ?? ""}
                      onChange={(e) => setEditedCharacter({ ...editedCharacter, appearance: e.target.value })}
                      placeholder="Short brown hair, blue jacket, casual style..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="char-edit-features">Distinctive Features</Label>
                    <Textarea
                      id="char-edit-features"
                      data-testid="input-character-features"
                      value={editedCharacter.features ?? selectedCharacter.features ?? ""}
                      onChange={(e) => setEditedCharacter({ ...editedCharacter, features: e.target.value })}
                      placeholder="Round glasses, friendly smile, athletic build..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Reference Images ({currentReferenceImages.length})</Label>
                    <div className="space-y-2 mt-2">
                      {currentReferenceImages.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {currentReferenceImages.map((url, index) => (
                            <div 
                              key={index} 
                              className="relative aspect-square rounded-md overflow-hidden border group"
                              data-testid={`img-reference-${index}`}
                            >
                              <img 
                                src={url} 
                                alt={`Reference ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveReferenceImage(index)}
                                data-testid={`button-remove-reference-${index}`}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-2">
                          No reference images added yet
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Input
                          data-testid="input-new-image-url"
                          placeholder="Paste image URL..."
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddReferenceImage()}
                        />
                        <Button 
                          size="icon" 
                          variant="outline"
                          onClick={handleAddReferenceImage}
                          disabled={!newImageUrl.trim()}
                          data-testid="button-add-image"
                        >
                          <ImagePlus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleSaveCharacter}
                    disabled={updateCharacterMutation.isPending || Object.keys(editedCharacter).length === 0}
                    data-testid="button-save-character"
                  >
                    {updateCharacterMutation.isPending ? "Saving..." : "Save Character"}
                  </Button>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p data-testid="text-no-selection">Select a character to edit or create a new one</p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel - Preview & Usage */}
          <div className="col-span-4">
            <Card className="p-4 h-[calc(100vh-180px)]">
              <h3 className="font-semibold mb-4">Preview & Usage</h3>
              {selectedCharacter ? (
                <div className="space-y-4">
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {currentReferenceImages.length > 0 ? (
                      <img
                        src={currentReferenceImages[0]}
                        alt={selectedCharacter.name}
                        className="w-full h-full object-cover"
                        data-testid="img-character-preview"
                      />
                    ) : (
                      <User className="w-16 h-16 text-muted-foreground" />
                    )}
                  </div>

                  <div>
                    <Label className="mb-2 block">Character Identity</Label>
                    <div className="text-sm bg-muted/50 rounded-md p-3 space-y-1">
                      <p><span className="text-muted-foreground">Name:</span> {selectedCharacter.name}</p>
                      {selectedCharacter.appearance && (
                        <p><span className="text-muted-foreground">Appearance:</span> {selectedCharacter.appearance}</p>
                      )}
                      {selectedCharacter.features && (
                        <p><span className="text-muted-foreground">Features:</span> {selectedCharacter.features}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Used in Storyboards</Label>
                    <div className="text-sm text-muted-foreground" data-testid="text-storyboard-usage">
                      Not used in any storyboard yet
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    data-testid="button-test-generation"
                  >
                    Test with Current Style
                  </Button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm" data-testid="text-no-preview">
                  No character selected
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* New Character Dialog */}
      <Dialog open={showNewCharacterDialog} onOpenChange={setShowNewCharacterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Character</DialogTitle>
            <DialogDescription>
              Define a new character for use in your storyboards
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-char-name">Character Name</Label>
              <Input
                id="new-char-name"
                data-testid="input-new-character-name"
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                placeholder="Protagonist"
              />
            </div>
            <div>
              <Label htmlFor="new-char-desc">Description</Label>
              <Input
                id="new-char-desc"
                data-testid="input-new-character-description"
                value={newCharacterDescription}
                onChange={(e) => setNewCharacterDescription(e.target.value)}
                placeholder="Main character of the story"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewCharacterDialog(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCharacter}
              disabled={createCharacterMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createCharacterMutation.isPending ? "Creating..." : "Create Character"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Character</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCharacter?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCharacter}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteCharacterMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
