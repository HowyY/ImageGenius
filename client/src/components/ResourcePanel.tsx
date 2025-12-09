import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Palette, 
  Users, 
  Box, 
  ChevronRight, 
  ChevronLeft,
  Check,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import type { StylePreset, SelectCharacter, SelectAsset, AssetReferenceImage } from "@shared/schema";
import { CroppedAvatar } from "@/components/AvatarCropDialog";
import { useRole } from "@/contexts/RoleContext";

interface CharacterCard {
  id: string;
  imageUrl?: string;
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

interface ResourcePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedStyleId: string;
  onStyleSelect: (styleId: string) => void;
  selectedCharacterIds?: string[];
  onCharacterToggle?: (characterId: string) => void;
}

export function ResourcePanel({
  isOpen,
  onToggle,
  selectedStyleId,
  onStyleSelect,
  selectedCharacterIds = [],
  onCharacterToggle,
}: ResourcePanelProps) {
  const { isDesigner } = useRole();
  const [activeTab, setActiveTab] = useState("styles");

  const { data: styles = [] } = useQuery<StylePreset[]>({
    queryKey: ["/api/styles"],
  });

  const { data: characters = [] } = useQuery<SelectCharacter[]>({
    queryKey: ["/api/characters"],
  });

  const { data: assets = [] } = useQuery<SelectAsset[]>({
    queryKey: ["/api/assets"],
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

  if (!isOpen) {
    return (
      <div className="fixed right-0 top-14 bottom-20 z-40 flex flex-col items-center py-4 bg-card border-l w-12">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="mb-4"
          data-testid="button-expand-panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex flex-col gap-4">
          <Button
            variant={activeTab === "styles" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => { setActiveTab("styles"); onToggle(); }}
            data-testid="button-tab-styles-collapsed"
          >
            <Palette className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTab === "characters" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => { setActiveTab("characters"); onToggle(); }}
            data-testid="button-tab-characters-collapsed"
          >
            <Users className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTab === "assets" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => { setActiveTab("assets"); onToggle(); }}
            data-testid="button-tab-assets-collapsed"
          >
            <Box className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-14 bottom-20 z-40 flex flex-col bg-card border-l w-72 shadow-lg">
      <div className="flex items-center justify-between p-3 border-b">
        <span className="font-medium text-sm">Resources</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          data-testid="button-collapse-panel"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-3 mt-3" style={{ width: "calc(100% - 24px)" }}>
          <TabsTrigger value="styles" data-testid="tab-styles">
            <Palette className="w-4 h-4 mr-1" />
            Styles
          </TabsTrigger>
          <TabsTrigger value="characters" data-testid="tab-characters">
            <Users className="w-4 h-4 mr-1" />
            Chars
          </TabsTrigger>
          <TabsTrigger value="assets" data-testid="tab-assets">
            <Box className="w-4 h-4 mr-1" />
            Assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="styles" className="flex-1 mt-0 p-3">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2">
              {styles.map((style) => (
                <Card
                  key={style.id}
                  className={`p-3 transition-all ${
                    selectedStyleId === style.id ? "ring-2 ring-primary" : ""
                  } ${isDesigner ? "cursor-pointer hover-elevate" : "cursor-default opacity-80"}`}
                  onClick={() => isDesigner && onStyleSelect(style.id)}
                  data-testid={`style-card-${style.id}`}
                >
                  <div className="flex items-center gap-2">
                    {selectedStyleId === style.id && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{style.label}</div>
                      {style.engines && style.engines.length > 0 && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {style.engines[0]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {isDesigner && (
              <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                <Link href="/style-editor" data-testid="link-edit-styles">
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Edit Styles
                </Link>
              </Button>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="characters" className="flex-1 mt-0 p-3">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2">
              {characters.map((character) => {
                const avatar = getCharacterAvatar(character);
                const isSelected = selectedCharacterIds.includes(character.id);
                
                return (
                  <Card
                    key={character.id}
                    className={`p-3 transition-all ${
                      isSelected ? "ring-2 ring-primary" : ""
                    } ${isDesigner && onCharacterToggle ? "cursor-pointer hover-elevate" : "cursor-default"}`}
                    onClick={() => isDesigner && onCharacterToggle?.(character.id)}
                    data-testid={`character-card-${character.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {avatar ? (
                        <CroppedAvatar
                          imageUrl={avatar.imageUrl}
                          crop={avatar.crop}
                          size={40}
                          className="rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{character.name}</div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
            {isDesigner && (
              <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                <Link href="/characters" data-testid="link-edit-characters">
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Edit Characters
                </Link>
              </Button>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="assets" className="flex-1 mt-0 p-3">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2">
              {assets.map((asset) => {
                const refImages = asset.referenceImages as AssetReferenceImage[] | null;
                const firstImage = refImages && refImages.length > 0 ? refImages[0].url : null;
                
                return (
                  <Card
                    key={asset.id}
                    className="p-3 hover-elevate transition-all"
                    data-testid={`asset-card-${asset.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {firstImage ? (
                        <img
                          src={firstImage}
                          alt={asset.name}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Box className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{asset.name}</div>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {asset.type}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {assets.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No assets yet
                </div>
              )}
            </div>
            {isDesigner && (
              <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                <Link href="/assets" data-testid="link-edit-assets">
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Edit Assets
                </Link>
              </Button>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
