
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Upload, User, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Character {
  id: string;
  name: string;
  description: string;
  referenceImageUrl?: string;
  appearance: string;
  features: string;
  createdAt: Date;
}

export default function CharacterEditor() {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewCharacterDialog, setShowNewCharacterDialog] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterDescription, setNewCharacterDescription] = useState("");
  const [editedCharacter, setEditedCharacter] = useState<Partial<Character>>({});
  const { toast } = useToast();

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
    });

    setShowNewCharacterDialog(false);
    setNewCharacterName("");
    setNewCharacterDescription("");
  };

  const handleSaveCharacter = () => {
    if (!selectedCharacter) return;

    const updates: Partial<Character> = {};
    if (editedCharacter.name !== undefined) updates.name = editedCharacter.name;
    if (editedCharacter.description !== undefined) updates.description = editedCharacter.description;
    if (editedCharacter.appearance !== undefined) updates.appearance = editedCharacter.appearance;
    if (editedCharacter.features !== undefined) updates.features = editedCharacter.features;

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
    if (!confirm(`Are you sure you want to delete "${selectedCharacter.name}"?`)) return;
    deleteCharacterMutation.mutate(selectedCharacter.id);
  };

  const { data: characters = [], isLoading } = useQuery<Character[]>({
    queryKey: ["/api/characters"],
  });

  const createCharacterMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string }) => {
      const res = await apiRequest("POST", "/api/characters", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/characters"] });
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<Character> }) => {
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

  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    char.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  // Reset edited state when selected character changes
  useEffect(() => {
    setEditedCharacter({});
  }, [selectedCharacterId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Character Editor</h1>
          <p className="text-muted-foreground">Create and manage characters for your storyboards</p>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel - Character List */}
          <div className="col-span-3">
            <Card className="p-4 h-[calc(100vh-180px)] flex flex-col">
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search characters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  onClick={() => setShowNewCharacterDialog(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Character
                </Button>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Loading characters...
                  </div>
                ) : filteredCharacters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {searchQuery ? "No characters match your search" : "No characters yet. Create your first character!"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCharacters.map((char) => (
                      <div
                        key={char.id}
                        onClick={() => setSelectedCharacterId(char.id)}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${
                          selectedCharacterId === char.id
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={char.referenceImageUrl} />
                            <AvatarFallback>
                              {char.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{char.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {char.description}
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
            <Card className="p-4 h-[calc(100vh-180px)]">
              {selectedCharacter ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{selectedCharacter.name}</h2>
                    <Button size="sm" variant="destructive" onClick={handleDeleteCharacter}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label>Character Name</Label>
                    <Input 
                      value={editedCharacter.name ?? selectedCharacter.name}
                      onChange={(e) => setEditedCharacter({ ...editedCharacter, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Input 
                      value={editedCharacter.description ?? selectedCharacter.description}
                      onChange={(e) => setEditedCharacter({ ...editedCharacter, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Appearance Details</Label>
                    <Textarea
                      value={editedCharacter.appearance ?? selectedCharacter.appearance}
                      onChange={(e) => setEditedCharacter({ ...editedCharacter, appearance: e.target.value })}
                      placeholder="Short brown hair, blue jacket, casual style..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Distinctive Features</Label>
                    <Textarea
                      value={editedCharacter.features ?? selectedCharacter.features}
                      onChange={(e) => setEditedCharacter({ ...editedCharacter, features: e.target.value })}
                      placeholder="Round glasses, friendly smile, athletic build..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Reference Images</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Upload character reference images (Coming soon)
                      </p>
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleSaveCharacter}
                    disabled={updateCharacterMutation.isPending}
                  >
                    {updateCharacterMutation.isPending ? "Saving..." : "Save Character"}
                  </Button>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Select a character to edit or create a new one
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
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    {selectedCharacter.referenceImageUrl ? (
                      <img
                        src={selectedCharacter.referenceImageUrl}
                        alt={selectedCharacter.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <User className="w-16 h-16 text-muted-foreground" />
                    )}
                  </div>

                  <div>
                    <Label className="mb-2 block">Used in Storyboards</Label>
                    <div className="text-sm text-muted-foreground">
                      Not used in any storyboard yet
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    Test with Current Style
                  </Button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm">
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
              <Label htmlFor="char-name">Character Name</Label>
              <Input
                id="char-name"
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                placeholder="Protagonist"
              />
            </div>
            <div>
              <Label htmlFor="char-desc">Description</Label>
              <Input
                id="char-desc"
                value={newCharacterDescription}
                onChange={(e) => setNewCharacterDescription(e.target.value)}
                placeholder="Main character of the story"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCharacterDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCharacter}
              disabled={createCharacterMutation.isPending}
            >
              {createCharacterMutation.isPending ? "Creating..." : "Create Character"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
