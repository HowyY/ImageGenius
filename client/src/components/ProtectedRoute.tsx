import { useRole } from "@/contexts/RoleContext";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "designer";
}

export function ProtectedRoute({ children, requiredRole = "designer" }: ProtectedRouteProps) {
  const { isDesigner } = useRole();
  const [, setLocation] = useLocation();

  if (requiredRole === "designer" && !isDesigner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center">
          <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2" data-testid="text-access-denied">
            Designer Access Required
          </h2>
          <p className="text-muted-foreground mb-6">
            This page is only accessible to Designers. As a Viewer, you have read-only access to Projects and Storyboards.
          </p>
          <Button onClick={() => setLocation("/projects")} data-testid="button-go-to-projects">
            Go to Projects
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
