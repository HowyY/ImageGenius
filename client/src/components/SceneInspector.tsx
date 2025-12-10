import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ChevronRight, 
  ChevronLeft,
  Check,
  Plus,
  X,
  Sparkles,
  Loader2,
  Palette,
  Users,
  FileText,
  Settings
} from "lucide-react";
import type { StylePreset, SelectCharacter, SelectStoryboardScene } from "@shared/schema";
import { CroppedAvatar } from "@/components/AvatarCropDialog";
import { useRole } from "@/contexts/RoleContext";

interface CharacterCard {
  id: string;
  imageUrl?: string;
  styleId?: string;
}

interface AvatarProfile {
  cardId?: string;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface SceneInspectorProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedScene: SelectStoryboardScene | null;
  selectedStyleId: string;
  onStyleSelect: (styleId: string) => void;
  onDescriptionChange: (description: string) => void;
  onDescriptionBlur: () => void;
  onCharacterToggle: (characterId: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  editingDescription: string | undefined;
}

export function SceneInspector({
  isOpen,
  onToggle,
  selectedScene,
  selectedStyleId,
  onStyleSelect,
  onDescriptionChange,
  onDescriptionBlur,
  onCharacterToggle,
  onGenerate,
  isGenerating,
  editingDescription,
}: SceneInspectorProps) {
  const [, navigate] = useLocation();
  const { isDesigner, isViewer } = useRole();

  const { data: styles = [] } = useQuery<StylePreset[]>({
    queryKey: ["/api/styles"],
  });

  const { data: characters = [] } = useQuery<SelectCharacter[]>({
    queryKey: ["/api/characters"],
  });

  const getCharacterAvatar = (character: SelectCharacter): { imageUrl: string; crop?: AvatarProfile["crop"] } | null => {
    const cards = (character.characterCards as CharacterCard[] | null) || [];
    const avatarProfiles = (character.avatarProfiles as Record<string, AvatarProfile> | null) || {};
    
    if (selectedStyleId) {
      if (avatarProfiles[selectedStyleId]?.cardId) {
        const profile = avatarProfiles[selectedStyleId];
        const avatarCard = cards.find(c => c.id === profile.cardId);
        if (avatarCard?.imageUrl) {
          return { imageUrl: avatarCard.imageUrl, crop: profile.crop };
        }
      }
    }
    
    for (const profile of Object.values(avatarProfiles)) {
      if (profile?.cardId) {
        const avatarCard = cards.find(c => c.id === profile.cardId);
        if (avatarCard?.imageUrl) {
          return { imageUrl: avatarCard.imageUrl, crop: profile.crop };
        }
      }
    }
    
    const cardWithImage = cards.find(c => c.imageUrl);
    if (cardWithImage?.imageUrl) {
      return { imageUrl: cardWithImage.imageUrl };
    }
    
    return null;
  };

  const selectedCharacterIds = selectedScene?.selectedCharacterIds || [];
  const sceneDescription = editingDescription !== undefined 
    ? editingDescription 
    : (selectedScene?.visualDescription || "");

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.aside
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          className="h-full flex flex-col bg-card border-l w-80 shadow-lg"
        >
          <div className="flex items-center justify-between p-3 border-b">
        <span className="font-medium text-sm">
          {selectedScene ? `Scene Inspector` : "Select a Scene"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          data-testid="button-collapse-inspector"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {!selectedScene ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-2">No Scene Selected</h3>
          <p className="text-sm text-muted-foreground">
            Click on a scene card to view and edit its properties
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                <FileText className="w-3 h-3" />
                Description
              </Label>
              <Textarea
                placeholder={isViewer ? "View-only mode" : "Enter scene description..."}
                value={sceneDescription}
                onChange={(e) => isDesigner && onDescriptionChange(e.target.value)}
                onBlur={() => isDesigner && onDescriptionBlur()}
                className="text-sm min-h-[120px] resize-none"
                readOnly={isViewer}
                data-testid="textarea-inspector-description"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-3">
                <Palette className="w-3 h-3" />
                Style
              </Label>
              <div className="space-y-2">
                {styles.map((style) => (
                  <Card
                    key={style.id}
                    className={`p-2 transition-all ${
                      selectedStyleId === style.id ? "ring-2 ring-primary bg-primary/5" : ""
                    } ${isDesigner ? "cursor-pointer hover-elevate" : "cursor-default opacity-80"}`}
                    onClick={() => isDesigner && onStyleSelect(style.id)}
                    data-testid={`inspector-style-${style.id}`}
                  >
                    <div className="flex items-center gap-2">
                      {selectedStyleId === style.id && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{style.label}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  Characters ({selectedCharacterIds.length})
                </Label>
                {isDesigner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/characters?from=storyboard&style=${selectedStyleId}`)}
                    data-testid="button-manage-characters"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Manage
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {characters.map((character) => {
                  const avatar = getCharacterAvatar(character);
                  const isSelected = selectedCharacterIds.includes(character.id);
                  const cards = (character.characterCards as CharacterCard[] | null) || [];
                  const hasStyleCard = cards.some(c => c.styleId === selectedStyleId);
                  
                  return (
                    <Card
                      key={character.id}
                      className={`p-2 transition-all ${
                        isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                      } ${isDesigner ? "cursor-pointer hover-elevate" : "cursor-default opacity-80"}`}
                      onClick={() => isDesigner && onCharacterToggle(character.id)}
                      data-testid={`inspector-character-${character.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {avatar ? (
                          <CroppedAvatar
                            imageUrl={avatar.imageUrl}
                            crop={avatar.crop}
                            size={32}
                            className="rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{character.name}</div>
                          {!hasStyleCard && (
                            <div className="text-[10px] text-amber-500">No card for this style</div>
                          )}
                        </div>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : (
                          <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </Card>
                  );
                })}
                {characters.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No characters available
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      )}

      {selectedScene && isDesigner && (
        <div className="p-4 border-t">
          <Button
            onClick={onGenerate}
            disabled={isGenerating || !sceneDescription.trim()}
            className="w-full"
            data-testid="button-inspector-generate"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>
        </div>
      )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
