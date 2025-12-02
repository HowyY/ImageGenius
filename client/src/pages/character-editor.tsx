import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus, Trash2, User, Search, Sparkles, Check, ImageIcon, LayoutGrid, Pencil, RefreshCw, ZoomIn, X, Users, Images, Menu, UserCircle, Crop } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AvatarCropDialog, CroppedAvatar } from "@/components/AvatarCropDialog";
import type { SelectCharacter, InsertCharacter, UpdateCharacter, CharacterCard, AvatarProfiles, AvatarCrop, AvatarProfile } from "@shared/schema";

interface Style {
  id: string;
  label: string;
  description: string;
  engines: string[];
}

export default function CharacterEditor() {
  // Handle URL params for pre-selection (e.g., from Style Editor's "Generate for this style" button)
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlCharacterId = urlParams.get("id");
  const urlStyleId = urlParams.get("style");
  
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(urlCharacterId || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewCharacterDialog, setShowNewCharacterDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [editedCharacter, setEditedCharacter] = useState<Partial<UpdateCharacter>>({});
  const [selectedStyleId, setSelectedStyleId] = useState<string>(urlStyleId || "");
  const [selectedAngle, setSelectedAngle] = useState<string>("front");
  const [selectedPose, setSelectedPose] = useState<string>("standing");
  const [selectedExpression, setSelectedExpression] = useState<string>("neutral");
  const [isCharacterSheet, setIsCharacterSheet] = useState(false);
  const [cleanBackground, setCleanBackground] = useState(true); // Default to clean/no background for reference images
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Edit card state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<CharacterCard | null>(null);
  const [editAngle, setEditAngle] = useState<string>("keep");
  const [editPose, setEditPose] = useState<string>("keep");
  const [editExpression, setEditExpression] = useState<string>("keep");
  const [editPrompt, setEditPrompt] = useState<string>("");
  const [regeneratedImageUrl, setRegeneratedImageUrl] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Preview dialog state
  const [previewCard, setPreviewCard] = useState<CharacterCard | null>(null);
  
  // Mobile panel state
  const [showMobileCharactersPanel, setShowMobileCharactersPanel] = useState(false);
  const [showMobileCardsPanel, setShowMobileCardsPanel] = useState(false);
  
  // Avatar crop dialog state
  const [showAvatarCropDialog, setShowAvatarCropDialog] = useState(false);
  const [avatarCropCard, setAvatarCropCard] = useState<CharacterCard | null>(null);
  const [avatarCropStyleId, setAvatarCropStyleId] = useState<string>("");
  
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

  const expressionOptions = [
    { value: "neutral", label: "Neutral" },
    { value: "happy", label: "Happy" },
    { value: "sad", label: "Sad" },
    { value: "angry", label: "Angry" },
    { value: "surprised", label: "Surprised" },
    { value: "excited", label: "Excited" },
    { value: "serious", label: "Serious" },
    { value: "tired", label: "Tired" },
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

  // Handle URL param pre-selection after data loads
  useEffect(() => {
    if (urlCharacterId && characters.length > 0 && !selectedCharacterId) {
      const exists = characters.find(c => c.id === urlCharacterId);
      if (exists) {
        setSelectedCharacterId(urlCharacterId);
      }
    }
  }, [urlCharacterId, characters, selectedCharacterId]);

  useEffect(() => {
    if (urlStyleId && styles.length > 0 && !selectedStyleId) {
      const exists = styles.find(s => s.id === urlStyleId);
      if (exists) {
        setSelectedStyleId(urlStyleId);
      }
    }
  }, [urlStyleId, styles, selectedStyleId]);

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
      avatarProfiles: {},
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
    if (editedCharacter.avatarProfiles !== undefined) updates.avatarProfiles = editedCharacter.avatarProfiles;

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
        angle: isCharacterSheet ? "sheet" : selectedAngle,
        pose: isCharacterSheet ? "sheet" : selectedPose,
        expression: isCharacterSheet ? "neutral" : selectedExpression,
        isCharacterSheet: isCharacterSheet,
        cleanBackground: cleanBackground,
      });
      const result = await res.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      toast({
        title: "Success",
        description: isCharacterSheet ? "Character sheet generated successfully" : "Character card generated successfully",
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

  const handleSetAvatar = (card: CharacterCard) => {
    if (!selectedCharacter) return;
    
    // Open the crop dialog for this card
    setAvatarCropCard(card);
    setAvatarCropStyleId(card.styleId);
    setShowAvatarCropDialog(true);
  };

  const handleSaveAvatarCrop = (crop: AvatarCrop) => {
    if (!selectedCharacter || !avatarCropCard || !avatarCropStyleId) return;
    
    const currentCards = editedCharacter.characterCards ?? selectedCharacter.characterCards ?? [];
    const currentProfiles: AvatarProfiles = editedCharacter.avatarProfiles ?? (selectedCharacter.avatarProfiles as AvatarProfiles) ?? {};
    
    // Update the avatar profile for this style
    const updatedProfiles: AvatarProfiles = {
      ...currentProfiles,
      [avatarCropStyleId]: {
        cardId: avatarCropCard.id,
        crop: crop,
      },
    };
    
    setEditedCharacter({
      ...editedCharacter,
      avatarProfiles: updatedProfiles,
      characterCards: currentCards,
    });
    
    const styleName = styles.find(s => s.id === avatarCropStyleId)?.label || avatarCropStyleId;
    toast({
      title: "Avatar Updated",
      description: `Avatar set for ${styleName} style`,
    });
    
    // Reset crop dialog state
    setAvatarCropCard(null);
    setAvatarCropStyleId("");
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

  const handleOpenEditDialog = (card: CharacterCard) => {
    setEditingCard(card);
    setEditAngle("keep");
    setEditPose("keep");
    setEditExpression("keep");
    setEditPrompt("");
    setRegeneratedImageUrl(null);
    setShowEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingCard(null);
    setRegeneratedImageUrl(null);
  };

  const handleRegenerateCard = async () => {
    if (!selectedCharacter || !editingCard) return;
    
    const visualPrompt = editedCharacter.visualPrompt ?? selectedCharacter.visualPrompt;
    
    // Determine if this is an edit (using edit prompt) or regenerate (using new settings)
    const hasEditPrompt = editPrompt.trim().length > 0;
    const hasSettingsChange = editAngle !== "keep" || editPose !== "keep" || editExpression !== "keep";
    
    if (!hasEditPrompt && !hasSettingsChange) {
      toast({
        title: "No changes",
        description: "Please enter an edit prompt or change at least one setting",
        variant: "destructive",
      });
      return;
    }

    setIsRegenerating(true);
    try {
      let imageUrl: string;
      
      if (hasEditPrompt) {
        // Edit mode: Use direct API call for local preview without global task tracking
        // Get the style's engines to select an appropriate engine
        const style = styles.find(s => s.id === editingCard.styleId);
        const engine = style?.engines?.[0] || "nanobanana";
        
        const res = await apiRequest("POST", "/api/generate", {
          prompt: editPrompt,
          styleId: editingCard.styleId,
          engine: engine,
          userReferenceImages: [editingCard.imageUrl],
          isEditMode: true,
        });
        const result = await res.json();
        imageUrl = result.imageUrl;
      } else {
        // Regenerate mode: Use character card generator with new settings
        if (!visualPrompt?.trim()) {
          toast({
            title: "Error",
            description: "Character has no visual description",
            variant: "destructive",
          });
          setIsRegenerating(false);
          return;
        }
        
        const res = await apiRequest("POST", "/api/characters/generate-card", {
          characterId: selectedCharacter.id,
          styleId: editingCard.styleId,
          visualPrompt: visualPrompt,
          angle: editAngle !== "keep" ? editAngle : (editingCard.angle || "front"),
          pose: editPose !== "keep" ? editPose : (editingCard.pose || "standing"),
          expression: editExpression !== "keep" ? editExpression : (editingCard.expression || "neutral"),
          isCharacterSheet: false,
        });
        const result = await res.json();
        imageUrl = result.card?.imageUrl;
      }
      
      if (imageUrl) {
        setRegeneratedImageUrl(imageUrl);
        toast({
          title: hasEditPrompt ? "Edited" : "Regenerated",
          description: "New image generated. Compare and choose to keep or discard.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process card",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleKeepRegenerated = () => {
    if (!selectedCharacter || !editingCard || !regeneratedImageUrl) return;
    
    const hasEditPrompt = editPrompt.trim().length > 0;
    const currentCards = editedCharacter.characterCards ?? selectedCharacter.characterCards ?? [];
    const updatedCards = currentCards.map((c: CharacterCard) => {
      if (c.id === editingCard.id) {
        return {
          ...c,
          imageUrl: regeneratedImageUrl,
          // Only update settings if changed (not "keep") and not in edit prompt mode
          angle: hasEditPrompt ? c.angle : (editAngle !== "keep" ? editAngle : c.angle),
          pose: hasEditPrompt ? c.pose : (editPose !== "keep" ? editPose : c.pose),
          expression: hasEditPrompt ? c.expression : (editExpression !== "keep" ? editExpression : c.expression),
        };
      }
      return c;
    });
    
    setEditedCharacter({
      ...editedCharacter,
      characterCards: updatedCards,
    });
    
    toast({
      title: "Success",
      description: "Card updated with new image",
    });
    
    handleCloseEditDialog();
  };

  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (char.visualPrompt?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
  const currentCards: CharacterCard[] = (editedCharacter.characterCards ?? selectedCharacter?.characterCards ?? []) as CharacterCard[];
  const currentSelectedCardId = editedCharacter.selectedCardId ?? selectedCharacter?.selectedCardId;
  const currentAvatarProfiles: AvatarProfiles = editedCharacter.avatarProfiles ?? (selectedCharacter?.avatarProfiles as AvatarProfiles) ?? {};
  const selectedCard = currentCards.find((c: CharacterCard) => c.id === currentSelectedCardId);

  // Get avatar for a specific style from the new per-style profiles
  const getAvatarForStyle = (styleId: string): { card: CharacterCard | undefined; crop: AvatarCrop | undefined } => {
    const profile = currentAvatarProfiles[styleId];
    if (profile) {
      const card = currentCards.find((c: CharacterCard) => c.id === profile.cardId);
      return { card, crop: profile.crop };
    }
    // Fallback to first card of this style
    const fallbackCard = currentCards.find((c: CharacterCard) => c.styleId === styleId);
    return { card: fallbackCard, crop: undefined };
  };

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

  // Reusable character list content for both desktop sidebar and mobile sheet
  const characterListContent = (
    <>
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
              const charAvatarProfiles = (char.avatarProfiles as AvatarProfiles) || {};
              
              // Get avatar for currently selected style, or use first available avatar
              const getCharAvatar = (): { imageUrl: string | null; crop: AvatarCrop | undefined } => {
                // First try the currently selected style
                if (selectedStyleId && charAvatarProfiles[selectedStyleId]) {
                  const profile = charAvatarProfiles[selectedStyleId];
                  const card = cards.find((c: CharacterCard) => c.id === profile.cardId);
                  if (card) return { imageUrl: card.imageUrl, crop: profile.crop };
                }
                // Then try any style that has an avatar profile
                for (const [_styleId, profile] of Object.entries(charAvatarProfiles)) {
                  const card = cards.find((c: CharacterCard) => c.id === profile.cardId);
                  if (card) return { imageUrl: card.imageUrl, crop: profile.crop };
                }
                // Fallback to selectedCard or first card
                const selectedCardImg = cards.find((c: CharacterCard) => c.id === char.selectedCardId);
                if (selectedCardImg) return { imageUrl: selectedCardImg.imageUrl, crop: undefined };
                if (cards.length > 0) return { imageUrl: cards[0].imageUrl, crop: undefined };
                return { imageUrl: null, crop: undefined };
              };
              
              const avatarData = getCharAvatar();
              
              return (
                <div
                  key={char.id}
                  data-testid={`card-character-${char.id}`}
                  onClick={() => {
                    setSelectedCharacterId(char.id);
                    setShowMobileCharactersPanel(false);
                  }}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    selectedCharacterId === char.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover-elevate"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {avatarData.imageUrl ? (
                      <CroppedAvatar
                        imageUrl={avatarData.imageUrl}
                        crop={avatarData.crop}
                        size={40}
                        className="shrink-0"
                      />
                    ) : (
                      <Avatar>
                        <AvatarFallback>
                          {char.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
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
    </>
  );

  // Reusable cards panel content for both desktop sidebar and mobile sheet
  const cardsPanelContent = (
    <>
      <h3 className="font-semibold mb-4">Character Cards</h3>
      {selectedCharacter ? (
        currentCards.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(cardsGroupedByStyle).map(([styleId, cards]) => {
              const style = styles.find(s => s.id === styleId);
              const avatarProfile = currentAvatarProfiles[styleId];
              const isAvatarSet = !!avatarProfile;
              
              return (
                <div key={styleId}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {style?.label || styleId}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {cards.length} card{cards.length !== 1 ? "s" : ""}
                    </span>
                    {isAvatarSet && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                        <UserCircle className="w-3 h-3 mr-1" />
                        Avatar Set
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {cards.map((card: CharacterCard) => {
                      const isAvatarCard = avatarProfile?.cardId === card.id;
                      
                      return (
                        <div 
                          key={card.id}
                          className={`relative rounded-md border-2 cursor-pointer group transition-all ${
                            currentSelectedCardId === card.id 
                              ? "border-primary ring-2 ring-primary/20" 
                              : "border-transparent hover:border-muted-foreground/30"
                          }`}
                          onClick={() => handleSelectCard(card.id)}
                          data-testid={`card-image-${card.id}`}
                        >
                          <AspectRatio ratio={4/3} className="bg-muted/30">
                            <img 
                              src={card.imageUrl} 
                              alt={`${selectedCharacter.name} - ${style?.label}`}
                              className="w-full h-full object-contain"
                            />
                          </AspectRatio>
                          {/* Indicators for selected card and avatar */}
                          <div className="absolute top-1 left-1 flex gap-1">
                            {currentSelectedCardId === card.id && (
                              <div className="bg-primary text-primary-foreground rounded-full p-1" title="Reference Card">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                            {isAvatarCard && (
                              <div className="bg-amber-500 text-white rounded-full p-1" title="Avatar for this style">
                                <UserCircle className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="w-6 h-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetAvatar(card);
                              }}
                              title="Set as Avatar (with crop)"
                              data-testid={`button-set-avatar-${card.id}`}
                            >
                              <Crop className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="w-6 h-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewCard(card);
                              }}
                              data-testid={`button-preview-card-${card.id}`}
                            >
                              <ZoomIn className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="w-6 h-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditDialog(card);
                              }}
                              data-testid={`button-edit-card-${card.id}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="w-6 h-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCard(card.id);
                              }}
                              data-testid={`button-delete-card-${card.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
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
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Character Editor</h1>
            <p className="text-muted-foreground hidden sm:block" data-testid="text-page-description">
              Create characters and generate style-specific character cards
            </p>
          </div>
          
          {/* Mobile navigation buttons */}
          <div className="flex lg:hidden gap-2">
            <Sheet open={showMobileCharactersPanel} onOpenChange={setShowMobileCharactersPanel}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-mobile-characters">
                  <Users className="w-4 h-4 mr-1" />
                  Characters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-4 flex flex-col">
                <SheetHeader className="mb-4">
                  <SheetTitle>Characters</SheetTitle>
                </SheetHeader>
                {characterListContent}
              </SheetContent>
            </Sheet>
            
            <Sheet open={showMobileCardsPanel} onOpenChange={setShowMobileCardsPanel}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-mobile-cards">
                  <Images className="w-4 h-4 mr-1" />
                  Cards
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-4 overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Character Cards</SheetTitle>
                </SheetHeader>
                {cardsPanelContent}
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel - Character List (Desktop only) */}
          <div className="hidden lg:block lg:col-span-3">
            <Card className="p-4 h-[calc(100vh-180px)] flex flex-col">
              {characterListContent}
            </Card>
          </div>

          {/* Center Panel - Character Details & Generation */}
          <div className="col-span-12 lg:col-span-5">
            <Card className="p-4 h-[calc(100vh-180px)] lg:h-[calc(100vh-180px)] overflow-y-auto">
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
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <Label>Generate Character Card</Label>
                        <p className="text-xs text-muted-foreground">
                          {isCharacterSheet 
                            ? "Generate a turnaround sheet with multiple angles" 
                            : "Select style, angle, pose, and expression"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="character-sheet-toggle" className="text-xs text-muted-foreground cursor-pointer">
                          <LayoutGrid className="w-4 h-4 inline mr-1" />
                          Sheet
                        </Label>
                        <Switch
                          id="character-sheet-toggle"
                          checked={isCharacterSheet}
                          onCheckedChange={setIsCharacterSheet}
                          data-testid="switch-character-sheet"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
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
                      
                      {!isCharacterSheet && (
                        <div className="grid grid-cols-3 gap-2">
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
                          
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Expression</Label>
                            <Select value={selectedExpression} onValueChange={setSelectedExpression}>
                              <SelectTrigger data-testid="select-expression">
                                <SelectValue placeholder="Expression..." />
                              </SelectTrigger>
                              <SelectContent>
                                {expressionOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      
                      {isCharacterSheet && (
                        <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
                          Character sheet will include: Front view, 3/4 view, Side view, and Back view in a single image
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="clean-bg-toggle" className="text-sm cursor-pointer">
                            Clean Background
                          </Label>
                          <span className="text-xs text-muted-foreground">(recommended for reference)</span>
                        </div>
                        <Switch
                          id="clean-bg-toggle"
                          checked={cleanBackground}
                          onCheckedChange={setCleanBackground}
                          data-testid="switch-clean-background"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={handleGenerateCard}
                      disabled={isGenerating || !selectedStyleId}
                      data-testid="button-generate-card"
                    >
                      {isCharacterSheet ? <LayoutGrid className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      {isGenerating ? "Generating..." : (isCharacterSheet ? "Generate Character Sheet" : "Generate Card")}
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

          {/* Right Panel - Card Gallery (Desktop only) */}
          <div className="hidden lg:block lg:col-span-4">
            <Card className="p-4 h-[calc(100vh-180px)] overflow-y-auto">
              {cardsPanelContent}
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

      {/* Edit Card Dialog with Comparison View */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Character Card</DialogTitle>
            <DialogDescription>
              Enter an edit prompt to modify the image, or change settings to regenerate with new parameters.
            </DialogDescription>
          </DialogHeader>
          
          {/* Edit Prompt Section */}
          <div className="space-y-2">
            <Label>Edit Prompt (optional)</Label>
            <Textarea
              placeholder="Describe what you want to change, e.g., 'add glasses', 'change hair color to blue', 'make the background darker'..."
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              className="min-h-[80px] resize-none"
              data-testid="textarea-edit-prompt"
            />
            <p className="text-xs text-muted-foreground">
              If provided, the AI will modify the current image based on your prompt. Leave empty to regenerate with new settings below.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Side - Original Image */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Original</h4>
                {editingCard && (
                  <div className="flex flex-wrap gap-1">
                    {editingCard.angle && (
                      <Badge variant="outline" className="text-xs">{editingCard.angle}</Badge>
                    )}
                    {editingCard.pose && (
                      <Badge variant="outline" className="text-xs">{editingCard.pose}</Badge>
                    )}
                    {editingCard.expression && (
                      <Badge variant="outline" className="text-xs">{editingCard.expression}</Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                {editingCard && (
                  <img 
                    src={editingCard.imageUrl} 
                    alt="Original card"
                    className="w-full h-full object-cover"
                    data-testid="img-original-card"
                  />
                )}
              </div>
            </div>
            
            {/* Right Side - Regenerated or Controls */}
            <div className="space-y-3">
              <h4 className="font-medium">
                {regeneratedImageUrl ? (editPrompt.trim() ? "Edited" : "Regenerated") : "Settings (for regenerate)"}
              </h4>
              
              {regeneratedImageUrl ? (
                <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                  <img 
                    src={regeneratedImageUrl} 
                    alt="Regenerated card"
                    className="w-full h-full object-cover"
                    data-testid="img-regenerated-card"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Angle Selector */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Angle</Label>
                    <Select value={editAngle} onValueChange={setEditAngle} disabled={!!editPrompt.trim()}>
                      <SelectTrigger data-testid="select-edit-angle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep">Keep Current ({editingCard?.angle || "not set"})</SelectItem>
                        {angleOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Pose Selector */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Pose</Label>
                    <Select value={editPose} onValueChange={setEditPose} disabled={!!editPrompt.trim()}>
                      <SelectTrigger data-testid="select-edit-pose">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep">Keep Current ({editingCard?.pose || "not set"})</SelectItem>
                        {poseOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Expression Selector */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Expression</Label>
                    <Select value={editExpression} onValueChange={setEditExpression} disabled={!!editPrompt.trim()}>
                      <SelectTrigger data-testid="select-edit-expression">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep">Keep Current ({editingCard?.expression || "not set"})</SelectItem>
                        {expressionOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {editPrompt.trim() && (
                    <p className="text-xs text-muted-foreground">
                      Settings are disabled when using edit prompt. Clear the prompt to change settings.
                    </p>
                  )}
                  
                  {/* Placeholder for regenerated image */}
                  <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
                    <div className="text-center text-muted-foreground">
                      {editPrompt.trim() ? (
                        <>
                          <Pencil className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Click Edit to apply changes</p>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Click Regenerate to preview</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            {regeneratedImageUrl ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setRegeneratedImageUrl(null)}
                  data-testid="button-discard-regenerated"
                >
                  Discard
                </Button>
                <Button 
                  onClick={handleKeepRegenerated}
                  data-testid="button-keep-regenerated"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Keep New Version
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCloseEditDialog}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleRegenerateCard}
                  disabled={isRegenerating}
                  data-testid="button-regenerate-card"
                >
                  {isRegenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {editPrompt.trim() ? "Editing..." : "Regenerating..."}
                    </>
                  ) : editPrompt.trim() ? (
                    <>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Image
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewCard} onOpenChange={(open) => !open && setPreviewCard(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
              onClick={() => setPreviewCard(null)}
              data-testid="button-close-preview"
            >
              <X className="w-4 h-4" />
            </Button>
            {previewCard && (
              <div className="flex flex-col">
                <div className="overflow-auto max-h-[80vh]">
                  <img 
                    src={previewCard.imageUrl} 
                    alt={`${selectedCharacter?.name || "Character"} preview`}
                    className="w-full h-auto"
                    data-testid="img-preview-full"
                  />
                </div>
                <div className="p-4 bg-background border-t flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {previewCard.angle && (
                      <Badge variant="secondary" className="text-xs">{previewCard.angle}</Badge>
                    )}
                    {previewCard.pose && (
                      <Badge variant="secondary" className="text-xs">{previewCard.pose}</Badge>
                    )}
                    {previewCard.expression && (
                      <Badge variant="outline" className="text-xs">{previewCard.expression}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleOpenEditDialog(previewCard);
                        setPreviewCard(null);
                      }}
                      data-testid="button-edit-from-preview"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSelectCard(previewCard.id);
                        setPreviewCard(null);
                      }}
                      data-testid="button-select-from-preview"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Select as Reference
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Crop Dialog */}
      {avatarCropCard && (
        <AvatarCropDialog
          open={showAvatarCropDialog}
          onOpenChange={setShowAvatarCropDialog}
          imageUrl={avatarCropCard.imageUrl}
          initialCrop={currentAvatarProfiles[avatarCropStyleId]?.crop}
          onSave={handleSaveAvatarCrop}
          characterName={selectedCharacter?.name}
          styleName={styles.find(s => s.id === avatarCropStyleId)?.label}
        />
      )}
    </div>
  );
}
