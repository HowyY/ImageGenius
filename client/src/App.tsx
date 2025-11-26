import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import Home from "@/pages/home";
import History from "@/pages/history";
import Storyboard from "@/pages/storyboard";
import StyleEditor from "@/pages/style-editor";
import CharacterEditor from "./pages/character-editor";
import PromptEditor from "./pages/prompt-editor";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/history" component={History} />
      <Route path="/storyboard" component={Storyboard} />
      <Route path="/style-editor" component={StyleEditor} />
      <Route path="/characters" component={CharacterEditor} />
      <Route path="/prompt-editor" component={PromptEditor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Navigation />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;