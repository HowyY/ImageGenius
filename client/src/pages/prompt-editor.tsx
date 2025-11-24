
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Save, Eye, Copy, RotateCcw, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StylePreset } from "@shared/schema";

interface PromptTemplate {
  name: string;
  cameraComposition: {
    enabled: boolean;
    cameraAngle: string;
    compositionLayout: string;
    framing: string;
    depthArrangement: string;
  };
  environment: {
    enabled: boolean;
    setting: string;
    lighting: string;
    atmosphere: string;
    backgroundComplexity: string;
  };
  mainCharacter: {
    enabled: boolean;
    pose: string;
    expression: string;
    interaction: string;
    clothing: string;
  };
  secondaryObjects: {
    enabled: boolean;
    objects: string;
    motionCues: string;
    scaleRules: string;
  };
  styleEnforcement: {
    enabled: boolean;
    styleRules: string;
    colorPalette: string;
    textureDensity: string;
  };
  negativePrompt: {
    enabled: boolean;
    items: string;
  };
}

const DEFAULT_TEMPLATE: PromptTemplate = {
  name: "Default Template",
  cameraComposition: {
    enabled: true,
    cameraAngle: "stable, undistorted view that clearly presents the subject",
    compositionLayout: "balanced framing",
    framing: "ensure the subject fits naturally without clipping or distortion",
    depthArrangement: "clearly separated foreground, midground, and background with proper scale",
  },
  environment: {
    enabled: true,
    setting: "[Scene description]",
    lighting: "soft, even light suitable for the scene",
    atmosphere: "match style tone",
    backgroundComplexity: "follow the same simplification level as the reference style",
  },
  mainCharacter: {
    enabled: true,
    pose: "natural posture derived from the described action",
    expression: "consistent with the character identity implied by the prompt",
    interaction: "accurately placed relative to props/environment with correct scale",
    clothing: "match character lock and respect style",
  },
  secondaryObjects: {
    enabled: true,
    objects: "follow the same stylization rules as the style preset",
    motionCues: "remain subtle and clean",
    scaleRules: "all objects obey correct scale and perspective",
  },
  styleEnforcement: {
    enabled: true,
    styleRules: "maintain consistent color palette, lighting, texture density, and stroke treatment",
    colorPalette: "consistent across all scenes",
    textureDensity: "uniform detail density",
  },
  negativePrompt: {
    enabled: true,
    items: `- inconsistent character identity
- incorrect character proportions
- distorted anatomy or broken limbs
- incorrect object scale
- broken perspective or impossible angles
- unwanted changes in clothing or hairstyle
- mismatched art style within the same scene
- unintended extra characters or duplicated faces
- chaotic or cluttered composition
- low-quality details such as blurry shapes or noisy textures`,
  },
};

export default function PromptEditor() {
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [template, setTemplate] = useState<PromptTemplate>(DEFAULT_TEMPLATE);
  const [previewPrompt, setPreviewPrompt] = useState("");
  const { toast } = useToast();

  const { data: styles, isLoading: stylesLoading } = useQuery<StylePreset[]>({
    queryKey: ["/api/styles"],
  });

  useEffect(() => {
    // Load the first style by default
    if (styles && styles.length > 0 && !selectedStyleId) {
      setSelectedStyleId(styles[0].id);
    }
  }, [styles]);

  useEffect(() => {
    // Load saved template for selected style
    if (selectedStyleId) {
      const storageKey = `promptTemplate_${selectedStyleId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setTemplate(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load saved template:", e);
          setTemplate(DEFAULT_TEMPLATE);
        }
      } else {
        setTemplate(DEFAULT_TEMPLATE);
      }
    }
  }, [selectedStyleId]);

  useEffect(() => {
    // Generate preview
    generatePreview();
  }, [template]);

  const generatePreview = () => {
    let prompt = "PROMPT TEMPLATE\n\n[SCENE — {userPrompt}]\n\n";

    if (template.cameraComposition.enabled) {
      prompt += "1. CAMERA & COMPOSITION\n";
      prompt += `- Camera angle: ${template.cameraComposition.cameraAngle}\n`;
      prompt += `- Composition layout: ${template.cameraComposition.compositionLayout}\n`;
      prompt += `- Framing: ${template.cameraComposition.framing}\n`;
      prompt += `- Depth arrangement: ${template.cameraComposition.depthArrangement}\n\n`;
    }

    if (template.environment.enabled) {
      prompt += "2. ENVIRONMENT\n";
      prompt += `- Setting: ${template.environment.setting}\n`;
      prompt += `- Lighting: ${template.environment.lighting}\n`;
      prompt += `- Atmosphere: ${template.environment.atmosphere}\n`;
      prompt += `- Background complexity: ${template.environment.backgroundComplexity}\n\n`;
    }

    if (template.mainCharacter.enabled) {
      prompt += "3. MAIN CHARACTER\n";
      prompt += `- Pose: ${template.mainCharacter.pose}\n`;
      prompt += `- Expression: ${template.mainCharacter.expression}\n`;
      prompt += `- Interaction: ${template.mainCharacter.interaction}\n`;
      prompt += `- Clothing: ${template.mainCharacter.clothing}\n\n`;
    }

    if (template.secondaryObjects.enabled) {
      prompt += "4. SECONDARY OBJECTS & ACTION\n";
      prompt += `- Objects: ${template.secondaryObjects.objects}\n`;
      prompt += `- Motion cues: ${template.secondaryObjects.motionCues}\n`;
      prompt += `- Scale rules: ${template.secondaryObjects.scaleRules}\n\n`;
    }

    if (template.styleEnforcement.enabled) {
      prompt += "5. STYLE ENFORCEMENT\n";
      prompt += `- ${template.styleEnforcement.styleRules}\n`;
      prompt += `- Color palette: ${template.styleEnforcement.colorPalette}\n`;
      prompt += `- Texture density: ${template.styleEnforcement.textureDensity}\n\n`;
    }

    if (template.negativePrompt.enabled) {
      prompt += "6. NEGATIVE PROMPT\n";
      prompt += template.negativePrompt.items;
    }

    setPreviewPrompt(prompt);
  };

  const handleSave = () => {
    if (!selectedStyleId) {
      toast({
        title: "No style selected",
        description: "Please select a style first.",
        variant: "destructive",
      });
      return;
    }
    
    const storageKey = `promptTemplate_${selectedStyleId}`;
    localStorage.setItem(storageKey, JSON.stringify(template));
    
    const selectedStyle = styles?.find(s => s.id === selectedStyleId);
    toast({
      title: "Template saved",
      description: `Template for ${selectedStyle?.label || selectedStyleId} has been saved.`,
    });
  };

  const handleReset = () => {
    setTemplate(DEFAULT_TEMPLATE);
    toast({
      title: "Template reset",
      description: "Template has been reset to default values.",
    });
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewPrompt);
    toast({
      title: "Copied to clipboard",
      description: "Preview prompt has been copied to clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Prompt Template Editor</h1>
          <p className="text-muted-foreground mt-2">
            Customize prompt templates for each style preset (Admin Only)
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <Palette className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <Label htmlFor="style-select" className="text-base font-semibold">
                Select Style to Edit
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Each style can have its own custom template
              </p>
            </div>
            <Select
              value={selectedStyleId}
              onValueChange={setSelectedStyleId}
              disabled={stylesLoading}
            >
              <SelectTrigger id="style-select" className="w-[280px]">
                <SelectValue placeholder={stylesLoading ? "Loading..." : "Select a style"} />
              </SelectTrigger>
              <SelectContent>
                {styles?.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Panel */}
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={template.name}
                  onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                  placeholder="My Custom Template"
                />
              </div>

              <Separator />

              <Tabs defaultValue="camera" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="camera">Camera</TabsTrigger>
                  <TabsTrigger value="environment">Environment</TabsTrigger>
                  <TabsTrigger value="character">Character</TabsTrigger>
                </TabsList>

                <TabsContent value="camera" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="camera-enabled">Enable Camera & Composition</Label>
                    <Switch
                      id="camera-enabled"
                      checked={template.cameraComposition.enabled}
                      onCheckedChange={(checked) =>
                        setTemplate({
                          ...template,
                          cameraComposition: { ...template.cameraComposition, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {template.cameraComposition.enabled && (
                    <>
                      <div>
                        <Label>Camera Angle</Label>
                        <Textarea
                          value={template.cameraComposition.cameraAngle}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              cameraComposition: {
                                ...template.cameraComposition,
                                cameraAngle: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Composition Layout</Label>
                        <Input
                          value={template.cameraComposition.compositionLayout}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              cameraComposition: {
                                ...template.cameraComposition,
                                compositionLayout: e.target.value,
                              },
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Framing</Label>
                        <Textarea
                          value={template.cameraComposition.framing}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              cameraComposition: {
                                ...template.cameraComposition,
                                framing: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Depth Arrangement</Label>
                        <Textarea
                          value={template.cameraComposition.depthArrangement}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              cameraComposition: {
                                ...template.cameraComposition,
                                depthArrangement: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="environment" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="env-enabled">Enable Environment</Label>
                    <Switch
                      id="env-enabled"
                      checked={template.environment.enabled}
                      onCheckedChange={(checked) =>
                        setTemplate({
                          ...template,
                          environment: { ...template.environment, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {template.environment.enabled && (
                    <>
                      <div>
                        <Label>Setting</Label>
                        <Input
                          value={template.environment.setting}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              environment: { ...template.environment, setting: e.target.value },
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Lighting</Label>
                        <Input
                          value={template.environment.lighting}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              environment: { ...template.environment, lighting: e.target.value },
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Atmosphere</Label>
                        <Input
                          value={template.environment.atmosphere}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              environment: { ...template.environment, atmosphere: e.target.value },
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Background Complexity</Label>
                        <Textarea
                          value={template.environment.backgroundComplexity}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              environment: {
                                ...template.environment,
                                backgroundComplexity: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="character" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="char-enabled">Enable Main Character</Label>
                    <Switch
                      id="char-enabled"
                      checked={template.mainCharacter.enabled}
                      onCheckedChange={(checked) =>
                        setTemplate({
                          ...template,
                          mainCharacter: { ...template.mainCharacter, enabled: checked },
                        })
                      }
                    />
                  </div>

                  {template.mainCharacter.enabled && (
                    <>
                      <div>
                        <Label>Pose</Label>
                        <Textarea
                          value={template.mainCharacter.pose}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              mainCharacter: { ...template.mainCharacter, pose: e.target.value },
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Expression</Label>
                        <Textarea
                          value={template.mainCharacter.expression}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              mainCharacter: {
                                ...template.mainCharacter,
                                expression: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Interaction</Label>
                        <Textarea
                          value={template.mainCharacter.interaction}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              mainCharacter: {
                                ...template.mainCharacter,
                                interaction: e.target.value,
                              },
                            })
                          }
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label>Clothing</Label>
                        <Textarea
                          value={template.mainCharacter.clothing}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              mainCharacter: { ...template.mainCharacter, clothing: e.target.value },
                            })
                          }
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="negative-enabled">Enable Negative Prompt</Label>
                  <Switch
                    id="negative-enabled"
                    checked={template.negativePrompt.enabled}
                    onCheckedChange={(checked) =>
                      setTemplate({
                        ...template,
                        negativePrompt: { ...template.negativePrompt, enabled: checked },
                      })
                    }
                  />
                </div>

                {template.negativePrompt.enabled && (
                  <div>
                    <Label>Negative Prompt Items</Label>
                    <Textarea
                      value={template.negativePrompt.items}
                      onChange={(e) =>
                        setTemplate({
                          ...template,
                          negativePrompt: { ...template.negativePrompt, items: e.target.value },
                        })
                      }
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
                <Button onClick={handleReset} variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </Card>

          {/* Preview Panel */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Preview</h2>
                <Button onClick={handleCopyPreview} variant="outline" size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>

              <div className="bg-muted rounded-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">{previewPrompt}</pre>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>
                  <strong>Note:</strong> The template will be applied when generating images. Use{" "}
                  <code>{"{userPrompt}"}</code> as a placeholder for the actual scene description.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
