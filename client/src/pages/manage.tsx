import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Manage() {
  return (
    <div className="min-h-screen bg-background pt-14 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Manage</h1>
          <p className="text-muted-foreground">Admin management area</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Admin Settings
            </CardTitle>
            <CardDescription>
              This page is reserved for admin management features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Settings className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
              <p className="text-muted-foreground max-w-md">
                Admin management features will be available here in a future update.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
