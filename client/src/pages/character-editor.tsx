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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Trash2, User, Search, Sparkles, Check, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { SelectCharacter, InsertCharacter, UpdateCharacter, CharacterCard } from "@shared/schema";

interface Style {
  id: string;
  label: string;
  description: string;
}

export default function CharacterEditor() {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewCharacterDialog, setShowNewCharacterDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [editedCharacter, setEditedCharacter] = useState<Partial<UpdateCharacter>>({});
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [selectedAngle, setSelectedAngle] = useState<string>("front");
  const [selectedPose, setSelectedPose] = useState<string>("standing");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const angleOptions = [
    { value: "front", label: "Front View" },
    { value: "three-quarter", label: "3/4 View" },
    { value: "side", label: "Side View (Profile)" },
    { value: "back", label: "Back View" },
  ];

  const poseOptions = [
    { value: "standing", label: "Standing" },
    { value: "sitting", label: "Sitting" },
    { value: "walking", label: "Walking" },
    { value: "action", label: "Action Pose" },
    { value: "portrait", label: "Portrait (Upper Body)" },
  ];

  const { data: characters = [], isLoading } = useQuery<SelectCharacter[]>({
    queryKey: ["/api/characters"],
  });

  const { data: styles = [] } = useQuery<Style[]>({
    queryKey: ["/api/styles"],
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
      visualPrompt: "",
      characterCards: [],
      selectedCardId: null,
      tags: [],
    });

    setShowNewCharacterDialog(false);
    setNewCharacterName("");
  };

  const handleSaveCharacter = () => {
    if (!selectedCharacter) return;

    const updates: UpdateCharacter = {};
    if (editedCharacter.name !== undefined) updates.name = editedCharacter.name;
    if (editedCharacter.visualPrompt !== undefined) updates.visualPrompt = editedCharacter.visualPrompt;
    if (editedCharacter.tags !== undefined) updates.tags = editedCharacter.tags;
    if (editedCharacter.characterCards !== undefined) updates.characterCards = editedCharacter.characterCards;
    if (editedCharacter.selectedCardId !== undefined) updates.selectedCardId = editedCharacter.selectedCardId;

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

  const handleGenerateCard = async () => {
    if (!selectedCharacter || !selectedStyleId) {
      toast({
        title: "Error",
        description: "Please select a style before generating",
        variant: "destructive",
      });
      return;
    }

    const visualPrompt = editedCharacter.visualPrompt ?? selectedCharacter.visualPrompt;
    if (!visualPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a visual description first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/characters/generate-card", {
        characterId: selectedCharacter.id,
        styleId: selectedStyleId,
        visualPrompt: visualPrompt,
        angle: selectedAngle,
        pose: selectedPose,
      });
      const result = await res.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      toast({
        title: "Success",
        description: "Character card generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate character card",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectCard = (cardId: string) => {
    if (!selectedCharacter) return;
    
    const currentCards = editedCharacter.characterCards ?? selectedCharacter.characterCards ?? [];
    setEditedCharacter({
      ...editedCharacter,
      selectedCardId: cardId,
      characterCards: currentCards,
    });
  };

  const handleDeleteCard = (cardId: string) => {
    if (!selectedCharacter) return;
    
    const currentCards = editedCharacter.characterCards ?? selectedCharacter.characterCards ?? [];
    const updatedCards = currentCards.filter((c: CharacterCard) => c.id !== cardId);
    const currentSelectedId = editedCharacter.selectedCardId ?? selectedCharacter.selectedCardId;
    
    setEditedCharacter({
      ...editedCharacter,
      characterCards: updatedCards,
      selectedCardId: currentSelectedId === cardId ? null : currentSelectedId,
    });
  };

  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (char.visualPrompt?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
  const currentCards: CharacterCard[] = (editedCharacter.characterCards ?? selectedCharacter?.characterCards ?? []) as CharacterCard[];
  const currentSelectedCardId = editedCharacter.selectedCardId ?? selectedCharacter?.selectedCardId;
  const selectedCard = currentCards.find((c: CharacterCard) => c.id === currentSelectedCardId);

  const cardsGroupedByStyle = currentCards.reduce((acc: Record<string, CharacterCard[]>, card: CharacterCard) => {
    if (!acc[card.styleId]) acc[card.styleId] = [];
    acc[card.styleId].push(card);
    return acc;
  }, {} as Record<string, CharacterCard[]>);

  useEffect(() => {
    setEditedCharacter({});
  }, [selectedCharacterId]);

  useEffect(() => {
    if (styles.length > 0 && !selectedStyleId) {
      setSelectedStyleId(styles[0].id);
    }
  }, [styles, selectedStyleId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Character Editor</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Create characters and generate style-specific character cards
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
                    {filteredCharacters.map((char) => {
                      const cards = (char.characterCards || []) as CharacterCard[];
                      const selectedCardImg = cards.find((c: CharacterCard) => c.id === char.selectedCardId);
                      return (
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
                              <AvatarImage src={selectedCardImg?.imageUrl} />
                              <AvatarFallback>
                                {char.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{char.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {cards.length} card{cards.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>

          {/* Center Panel - Character Details & Generation */}
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
                    <Label htmlFor="char-edit-prompt">Visual Description</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Describe the character's appearance for AI generation
                    </p>
                    <Textarea
                      id="char-edit-prompt"
                      data-testid="input-visual-prompt"
                      value={editedCharacter.visualPrompt ?? selectedCharacter.visualPrompt ?? ""}
                      onChange={(e) => setEditedCharacter({ ...editedCharacter, visualPrompt: e.target.value })}
                      placeholder="Young woman with long black hair, wearing a red dress, confident expression, athletic build..."
                      rows={5}
                    />
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div>
                      <Label>Generate Character Card</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Select style, angle, and pose for the character card
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Style</Label>
                        <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                          <SelectTrigger data-testid="select-style">
                            <SelectValue placeholder="Style..." />
                          </SelectTrigger>
                          <SelectContent>
                            {styles.map((style) => (
                              <SelectItem key={style.id} value={style.id}>
                                {style.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Angle</Label>
                        <Select value={selectedAngle} onValueChange={setSelectedAngle}>
                          <SelectTrigger data-testid="select-angle">
                            <SelectValue placeholder="Angle..." />
                          </SelectTrigger>
                          <SelectContent>
                            {angleOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Pose</Label>
                        <Select value={selectedPose} onValueChange={setSelectedPose}>
                          <SelectTrigger data-testid="select-pose">
                            <SelectValue placeholder="Pose..." />
                          </SelectTrigger>
                          <SelectContent>
                            {poseOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={handleGenerateCard}
                      disabled={isGenerating || !selectedStyleId}
                      data-testid="button-generate-card"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {isGenerating ? "Generating..." : "Generate Card"}
                    </Button>
                  </div>

                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handleSaveCharacter}
                    disabled={updateCharacterMutation.isPending || Object.keys(editedCharacter).length === 0}
                    data-testid="button-save-character"
                  >
                    {updateCharacterMutation.isPending ? "Saving..." : "Save Changes"}
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

          {/* Right Panel - Card Gallery */}
          <div className="col-span-4">
            <Card className="p-4 h-[calc(100vh-180px)] overflow-y-auto">
              <h3 className="font-semibold mb-4">Character Cards</h3>
              {selectedCharacter ? (
                currentCards.length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(cardsGroupedByStyle).map(([styleId, cards]) => {
                      const style = styles.find(s => s.id === styleId);
                      return (
                        <div key={styleId}>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {style?.label || styleId}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {cards.length} card{cards.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {cards.map((card: CharacterCard) => (
                              <div 
                                key={card.id}
                                className={`relative aspect-square rounded-md overflow-hidden border-2 cursor-pointer group transition-all ${
                                  currentSelectedCardId === card.id 
                                    ? "border-primary ring-2 ring-primary/20" 
                                    : "border-transparent hover:border-muted-foreground/30"
                                }`}
                                onClick={() => handleSelectCard(card.id)}
                                data-testid={`card-image-${card.id}`}
                              >
                                <img 
                                  src={card.imageUrl} 
                                  alt={`${selectedCharacter.name} - ${style?.label}`}
                                  className="w-full h-full object-cover"
                                />
                                {currentSelectedCardId === card.id && (
                                  <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-1">
                                    <Check className="w-3 h-3" />
                                  </div>
                                )}
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCard(card.id);
                                  }}
                                  data-testid={`button-delete-card-${card.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm" data-testid="text-no-cards">No character cards yet</p>
                    <p className="text-xs mt-1">Generate cards using different styles</p>
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-preview">
                  Select a character to view cards
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
              Enter a name for your new character
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-char-name">Character Name</Label>
            <Input
              id="new-char-name"
              data-testid="input-new-character-name"
              value={newCharacterName}
              onChange={(e) => setNewCharacterName(e.target.value)}
              placeholder="Protagonist"
              onKeyDown={(e) => e.key === "Enter" && handleCreateCharacter()}
            />
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
              Are you sure you want to delete "{selectedCharacter?.name}"? This will also delete all character cards. This action cannot be undone.
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
