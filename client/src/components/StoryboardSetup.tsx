import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Palette, Users, Play, Settings, ChevronRight } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SelectStyle, SelectStoryboard, SelectCharacter } from "@shared/schema";

type SetupStep = "style" | "characters" | "ready";

interface StoryboardSetupProps {
  storyboard: SelectStoryboard;
  onComplete: () => void;
  onOpenStyleEditor: () => void;
  onOpenCharacterEditor: () => void;
  initialStep?: SetupStep;
}

export function StoryboardSetup({
  storyboard,
  onComplete,
  onOpenStyleEditor,
  onOpenCharacterEditor,
  initialStep = "style",
}: StoryboardSetupProps) {
  const { toast } = useToast();
  const [styleConfirmed, setStyleConfirmed] = useState(initialStep !== "style");
  const [charactersConfirmed, setCharactersConfirmed] = useState(initialStep === "ready");
  const [currentStep, setCurrentStep] = useState<SetupStep>(initialStep);

  const { data: styles } = useQuery<SelectStyle[]>({
    queryKey: ["/api/styles"],
  });

  const { data: characters } = useQuery<SelectCharacter[]>({
    queryKey: ["/api/characters"],
  });

  const selectedStyle = styles?.find(s => s.id === storyboard.styleId);

  const completeSetupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/storyboards/${storyboard.id}`, {
        setupCompleted: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storyboards"] });
      onComplete();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete setup",
        variant: "destructive",
      });
    },
  });

  const handleConfirmStyle = () => {
    setStyleConfirmed(true);
    setCurrentStep("characters");
  };

  const handleConfirmCharacters = () => {
    setCharactersConfirmed(true);
    setCurrentStep("ready");
  };

  const handleStartStoryboard = () => {
    completeSetupMutation.mutate();
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-6">
      <Card className="w-full max-w-2xl p-8">
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold mb-2" data-testid="text-setup-title">
              Set Up Your Storyboard
            </h1>
            <p className="text-muted-foreground">
              Configure style and characters before creating scenes
            </p>
            <p className="text-xs text-muted-foreground mt-2" data-testid="text-edit-hint">
              You can always edit these settings later from the storyboard menu.
            </p>
          </div>

          <div className="space-y-4">
            <div 
              className={`p-4 rounded-md border transition-colors ${
                currentStep === "style" 
                  ? "border-primary bg-primary/5" 
                  : styleConfirmed 
                    ? "border-border bg-muted/30" 
                    : "border-border"
              }`}
              data-testid="setup-step-style"
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  styleConfirmed 
                    ? "bg-primary text-primary-foreground" 
                    : currentStep === "style" 
                      ? "bg-primary/20 text-primary" 
                      : "bg-muted text-muted-foreground"
                }`}>
                  {styleConfirmed ? <Check className="w-4 h-4" /> : <Palette className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-medium">Project Style</h3>
                    {styleConfirmed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStyleConfirmed(false);
                          setCurrentStep("style");
                        }}
                        data-testid="button-edit-style-step"
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                  
                  {selectedStyle ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <img 
                            src={selectedStyle.referenceImageUrl} 
                            alt={selectedStyle.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium">{selectedStyle.label}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {selectedStyle.description}
                          </p>
                        </div>
                      </div>
                      
                      {currentStep === "style" && !styleConfirmed && (
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenStyleEditor}
                            data-testid="button-adjust-style"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Adjust Style
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleConfirmStyle}
                            data-testid="button-confirm-style"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Confirm Style
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        No style selected for this project
                      </p>
                      {currentStep === "style" && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenStyleEditor}
                            data-testid="button-select-style"
                          >
                            <Palette className="w-4 h-4 mr-2" />
                            Select Style
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleConfirmStyle}
                            data-testid="button-skip-style"
                          >
                            Skip for now
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div 
              className={`p-4 rounded-md border transition-colors ${
                currentStep === "characters" 
                  ? "border-primary bg-primary/5" 
                  : charactersConfirmed
                    ? "border-border bg-muted/30"
                    : "border-border opacity-60"
              }`}
              data-testid="setup-step-characters"
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  charactersConfirmed
                    ? "bg-primary text-primary-foreground"
                    : currentStep === "characters"
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}>
                  {charactersConfirmed ? <Check className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-medium">Characters</h3>
                    {charactersConfirmed && currentStep === "ready" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCharactersConfirmed(false);
                          setCurrentStep("characters");
                        }}
                        data-testid="button-edit-characters-step"
                      >
                        Edit
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Optional</span>
                    )}
                  </div>
                  
                  {characters && characters.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {characters.length} character{characters.length !== 1 ? "s" : ""} available
                      </p>
                      {currentStep === "characters" && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenCharacterEditor}
                            data-testid="button-manage-characters"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Manage Characters
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleConfirmCharacters}
                            data-testid="button-continue-characters"
                          >
                            Continue
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        No characters created yet
                      </p>
                      {currentStep === "characters" && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenCharacterEditor}
                            data-testid="button-create-characters"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Create Characters
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleConfirmCharacters}
                            data-testid="button-skip-characters"
                          >
                            Skip for now
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div 
              className={`p-4 rounded-md border transition-colors ${
                currentStep === "ready" 
                  ? "border-primary bg-primary/5" 
                  : "border-border opacity-60"
              }`}
              data-testid="setup-step-ready"
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === "ready"
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <Play className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium mb-2">Start Creating</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Begin adding scenes and generating images
                  </p>
                  {currentStep === "ready" && (
                    <Button
                      onClick={handleStartStoryboard}
                      disabled={completeSetupMutation.isPending}
                      data-testid="button-start-storyboard"
                    >
                      {completeSetupMutation.isPending ? (
                        "Starting..."
                      ) : (
                        <>
                          Start Creating Storyboard
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
