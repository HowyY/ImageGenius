import { useRole } from "@/contexts/RoleContext";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Wrench, 
  Palette, 
  Users, 
  Box, 
  GitBranch, 
  History, 
  Sparkles,
  Moon,
  Sun,
  Eye,
  PenTool,
  ArrowLeft
} from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";

export function TopToolbar() {
  const { isDesigner, role, setRole } = useRole();
  const { theme, setTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const isFromSetup = urlParams.get("from") === "setup";

  const designerTools = [
    { label: "Generate", icon: Sparkles, path: "/generate" },
    { label: "History", icon: History, path: "/history" },
    { label: "Style Editor", icon: Palette, path: "/style-editor" },
    { label: "Character Editor", icon: Users, path: "/characters" },
    { label: "Asset Editor", icon: Box, path: "/assets" },
    { label: "Node Editor", icon: GitBranch, path: "/node-editor" },
  ];

  const toolPaths = ["/generate", "/history", "/style-editor", "/characters", "/assets", "/node-editor", "/prompt-editor", "/manage"];
  const locationPath = location.split("?")[0];
  const isOnToolPage = toolPaths.some(path => locationPath === path);

  const isToolActive = (path: string) => location === path;

  const handleBack = () => {
    setLocation("/storyboard");
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-background border-b z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            {isOnToolPage && !isFromSetup && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                data-testid="button-back"
                title="Back to Storyboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Link href="/projects" className="font-semibold text-lg" data-testid="link-home">
              ImageGenius
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {isDesigner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid="button-tools-menu">
                    <Wrench className="w-4 h-4 mr-2" />
                    Tools
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Designer Tools</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {designerTools.map((tool) => (
                    <DropdownMenuItem key={tool.path} asChild>
                      <Link 
                        href={tool.path} 
                        className={isToolActive(tool.path) ? "bg-accent" : ""}
                        data-testid={`link-tool-${tool.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <tool.icon className="w-4 h-4 mr-2" />
                        {tool.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-role-switcher">
                  {isDesigner ? (
                    <PenTool className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setRole("viewer")}
                  className={role === "viewer" ? "bg-accent" : ""}
                  data-testid="menu-role-viewer"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Viewer
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setRole("designer")}
                  className={role === "designer" ? "bg-accent" : ""}
                  data-testid="menu-role-designer"
                >
                  <PenTool className="w-4 h-4 mr-2" />
                  Designer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
