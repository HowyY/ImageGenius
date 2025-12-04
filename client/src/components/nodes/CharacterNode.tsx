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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, ChevronDown, Plus, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { SelectCharacter, CharacterCard } from "@shared/schema";

interface CharacterNodeData {
  characterId?: string;
  name: string;
  visualPrompt: string;
  onChange?: (data: { characterId?: string; name?: string; visualPrompt?: string }) => void;
}

function CharacterNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as unknown as CharacterNodeData;
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterPrompt, setNewCharacterPrompt] = useState("");

  const { data: characters = [] } = useQuery<SelectCharacter[]>({
    queryKey: ["/api/characters"],
  });

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

  const handleSelectCharacter = useCallback(
    (character: SelectCharacter) => {
      nodeData.onChange?.({
        characterId: character.id,
        name: character.name,
        visualPrompt: character.visualPrompt || "",
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
