import { StageNavigation } from "@/components/StageNavigation";
import { Card } from "@/components/ui/card";
import { Headphones } from "lucide-react";

export default function Audio() {
  return (
    <div className="min-h-screen bg-background pt-14 pb-20">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Headphones className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Audio</h1>
            <p className="text-muted-foreground text-sm">Add voices and sound effects</p>
          </div>
        </div>
        
        <Card className="p-8 text-center">
          <Headphones className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Audio Editor</h2>
          <p className="text-muted-foreground">
            This page will allow you to generate and manage audio for your scenes.
          </p>
        </Card>
      </div>
      
      <StageNavigation />
    </div>
  );
}
