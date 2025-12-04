import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, History, Sparkles, LayoutGrid, Menu, Users, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: "Generate", icon: Home, testId: "button-nav-home" },
  { href: "/storyboard", label: "Storyboard", icon: LayoutGrid, testId: "button-nav-storyboard" },
  { href: "/history", label: "History", icon: History, testId: "button-nav-history" },
  { href: "/style-editor", label: "Style Editor", icon: Sparkles, testId: "button-nav-style-editor" },
  { href: "/characters", label: "Characters", icon: Users, testId: "button-nav-characters" },
  { href: "/node-editor", label: "Node Editor", icon: GitBranch, testId: "button-nav-node-editor", isBeta: true },
];

export function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">AI Image Generator</span>
          </div>
          
          {/* Desktop navigation - hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={location === item.href ? "default" : "ghost"}
                size="sm"
                asChild
                data-testid={item.testId}
              >
                <Link href={item.href}>
                  <item.icon className="w-4 h-4 mr-1.5" />
                  {item.label}
                  {"isBeta" in item && item.isBeta && (
                    <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
                      Beta
                    </Badge>
                  )}
                </Link>
              </Button>
            ))}
          </nav>

          {/* Mobile hamburger menu - visible only on mobile */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Navigation
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-6">
                {navItems.map((item) => (
                  <Button
                    key={item.href}
                    variant={location === item.href ? "default" : "ghost"}
                    className="justify-start"
                    asChild
                    data-testid={`${item.testId}-mobile`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.label}
                      {"isBeta" in item && item.isBeta && (
                        <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
                          Beta
                        </Badge>
                      )}
                    </Link>
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
