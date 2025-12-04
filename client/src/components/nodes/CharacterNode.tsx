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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, ChevronDown, Plus, Check, Sparkles, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { SelectCharacter, CharacterCard, SelectStyle } from "@shared/schema";

interface CharacterNodeData {
  characterId?: string;
  name: string;
  visualPrompt: string;
  styleId?: string;
  generatedImage?: string;
  onChange?: (data: { characterId?: string; name?: string; visualPrompt?: string; styleId?: string; generatedImage?: string }) => void;
}

function CharacterNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as unknown as CharacterNodeData;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterPrompt, setNewCharacterPrompt] = useState("");

  const { data: characters = [] } = useQuery<SelectCharacter[]>({
    queryKey: ["/api/characters"],
  });

  const { data: styles = [] } = useQuery<SelectStyle[]>({
    queryKey: ["/api/styles"],
  });

  const visibleStyles = styles.filter((s) => !s.isHidden);

  const createCharacterMutation = useMutation({
    mutationFn: async (data: { name: string; visualPrompt: string }) => {
      const charId = `char_${Date.now()}`;
      return apiRequest("POST", "/api/characters", {
        id: charId,
        name: data.name,
        visualPrompt: data.visualPrompt,
        characterCards: [],
        tags: [],
      });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
      const newChar = await response.json();
      nodeData.onChange?.({
        characterId: newChar.id,
        name: newChar.name,
        visualPrompt: newChar.visualPrompt,
      });
      setCreateDialogOpen(false);
      setNewCharacterName("");
      setNewCharacterPrompt("");
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
      if (result.imageUrl && nodeData.characterId) {
        const character = characters.find((c) => c.id === nodeData.characterId);
        if (character) {
          const existingCards = (character.characterCards as CharacterCard[] | null) || [];
          const newCard: CharacterCard = {
            id: `card_${Date.now()}`,
            styleId: nodeData.styleId || "",
            imageUrl: result.imageUrl,
            prompt: nodeData.visualPrompt,
            createdAt: new Date().toISOString(),
          };
          
          await apiRequest("PATCH", `/api/characters/${nodeData.characterId}`, {
            characterCards: [...existingCards, newCard],
            selectedCardId: newCard.id,
          });
          
          await queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
          
          nodeData.onChange?.({
            ...nodeData,
            generatedImage: result.imageUrl,
          });
          
          toast({
            title: "Character Generated",
            description: "Character image has been saved to character cards.",
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

  const handleSelectCharacter = useCallback(
    (character: SelectCharacter) => {
      const avatar = getCharacterAvatar(character);
      nodeData.onChange?.({
        characterId: character.id,
        name: character.name,
        visualPrompt: character.visualPrompt || "",
        generatedImage: avatar || undefined,
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
    if (!newCharacterName.trim()) return;
    createCharacterMutation.mutate({
      name: newCharacterName.trim(),
      visualPrompt: newCharacterPrompt.trim(),
    });
  }, [newCharacterName, newCharacterPrompt, createCharacterMutation]);

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
    if (!nodeData.characterId) {
      toast({
        title: "Cannot Generate",
        description: "Please select a character first.",
        variant: "destructive",
      });
      return;
    }
    
    if (!nodeData.visualPrompt) {
      toast({
        title: "Cannot Generate",
        description: "Character has no visual description.",
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
      prompt: `Character portrait: ${nodeData.visualPrompt}`,
      styleId: nodeData.styleId,
    });
  }, [nodeData, generateMutation, toast]);

  const getCharacterAvatar = useCallback((character: SelectCharacter) => {
    const cards = (character.characterCards as CharacterCard[] | null) || [];
    if (character.selectedCardId) {
      const selectedCard = cards.find((c) => c.id === character.selectedCardId);
      if (selectedCard?.imageUrl) return selectedCard.imageUrl;
    }
    const cardWithImage = cards.find((c) => c.imageUrl);
    return cardWithImage?.imageUrl || null;
  }, []);

  const selectedCharacter = characters.find((c) => c.id === nodeData.characterId);
  const displayImage = nodeData.generatedImage || (selectedCharacter ? getCharacterAvatar(selectedCharacter) : null);

  return (
    <>
      <Card className="w-[280px] shadow-lg border-2 border-blue-500/50 bg-card" data-testid={`node-character-${id}`}>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <User className="w-4 h-4 text-blue-500" />
            </div>
            Character
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Select Character</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-9 text-sm"
                  data-testid="button-select-character"
                >
                  {selectedCharacter ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={getCharacterAvatar(selectedCharacter) || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {selectedCharacter.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{selectedCharacter.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select character...</span>
                  )}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search characters..." />
                  <CommandList>
                    <CommandEmpty>No characters found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreateNew}
                        className="text-blue-600 dark:text-blue-400"
                        data-testid="option-create-character"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Character
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Characters">
                      {characters.map((character) => (
                        <CommandItem
                          key={character.id}
                          value={character.name}
                          onSelect={() => handleSelectCharacter(character)}
                          data-testid={`option-character-${character.id}`}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={getCharacterAvatar(character) || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {character.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{character.name}</span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              nodeData.characterId === character.id ? "opacity-100" : "opacity-0"
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

          {selectedCharacter && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Style</Label>
                <Select value={nodeData.styleId || ""} onValueChange={handleStyleChange}>
                  <SelectTrigger className="h-9 text-sm" data-testid="select-character-style">
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
                      alt={nodeData.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <Button
                size="sm"
                className="w-full"
                onClick={handleGenerate}
                disabled={!nodeData.characterId || !nodeData.visualPrompt || !nodeData.styleId || generateMutation.isPending}
                data-testid="button-generate-character"
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
          className="w-3 h-3 bg-blue-500 border-2 border-background"
        />
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Character</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                placeholder="Character name..."
                data-testid="input-new-character-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Visual Description</Label>
              <Textarea
                value={newCharacterPrompt}
                onChange={(e) => setNewCharacterPrompt(e.target.value)}
                placeholder="Describe the character's appearance..."
                className="min-h-[100px]"
                data-testid="input-new-character-prompt"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={!newCharacterName.trim() || createCharacterMutation.isPending}
              data-testid="button-create-character-submit"
            >
              {createCharacterMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const CharacterNode = memo(CharacterNodeComponent);
