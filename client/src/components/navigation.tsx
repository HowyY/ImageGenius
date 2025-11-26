import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, History, Sparkles, LayoutGrid } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl">AI Image Generator</span>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Button
              variant={location === "/" ? "default" : "ghost"}
              size="sm"
              asChild
              data-testid="button-nav-home"
            >
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Generate
              </Link>
            </Button>
            <Button
              variant={location === "/storyboard" ? "default" : "ghost"}
              size="sm"
              asChild
              data-testid="button-nav-storyboard"
            >
              <Link href="/storyboard">
                <LayoutGrid className="w-4 h-4 mr-2" />
                Storyboard
              </Link>
            </Button>
            <Button
              variant={location === "/history" ? "default" : "ghost"}
              size="sm"
              asChild
              data-testid="button-nav-history"
            >
              <Link href="/history">
                <History className="w-4 h-4 mr-2" />
                History
              </Link>
            </Button>
            <Button
              variant={location === "/prompt-editor" ? "default" : "ghost"}
              size="sm"
              asChild
              data-testid="button-nav-prompt-editor"
            >
              <Link href="/prompt-editor">
                <Sparkles className="w-4 h-4 mr-2" />
                Prompt Editor
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}