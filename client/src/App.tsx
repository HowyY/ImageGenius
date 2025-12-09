import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { RoleProvider } from "@/contexts/RoleContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navigation } from "@/components/navigation";
import { GenerationProvider } from "@/contexts/GenerationContext";
import { GenerationStatusPanel } from "@/components/GenerationStatusPanel";
import Home from "@/pages/home";
import History from "@/pages/history";
import Projects from "@/pages/projects";
import Storyboard from "@/pages/storyboard";
import StyleEditor from "@/pages/style-editor";
import CharacterEditor from "./pages/character-editor";
import PromptEditor from "./pages/prompt-editor";
import NodeEditor from "./pages/node-editor";
import AssetEditor from "./pages/asset-editor";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <ProtectedRoute requiredRole="designer">
          <Home />
        </ProtectedRoute>
      </Route>
      <Route path="/projects" component={Projects} />
      <Route path="/history">
        <ProtectedRoute requiredRole="designer">
          <History />
        </ProtectedRoute>
      </Route>
      <Route path="/storyboard" component={Storyboard} />
      <Route path="/style-editor">
        <ProtectedRoute requiredRole="designer">
          <StyleEditor />
        </ProtectedRoute>
      </Route>
      <Route path="/characters">
        <ProtectedRoute requiredRole="designer">
          <CharacterEditor />
        </ProtectedRoute>
      </Route>
      <Route path="/prompt-editor">
        <ProtectedRoute requiredRole="designer">
          <PromptEditor />
        </ProtectedRoute>
      </Route>
      <Route path="/node-editor">
        <ProtectedRoute requiredRole="designer">
          <NodeEditor />
        </ProtectedRoute>
      </Route>
      <Route path="/assets">
        <ProtectedRoute requiredRole="designer">
          <AssetEditor />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RoleProvider>
          <TooltipProvider>
            <GenerationProvider>
              <Navigation />
              <Toaster />
              <Router />
              <GenerationStatusPanel />
            </GenerationProvider>
          </TooltipProvider>
        </RoleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;