import { useRole, UserRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Palette, ChevronDown, Check } from "lucide-react";

const roles: { value: UserRole; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "designer", label: "Designer", icon: Palette },
  { value: "viewer", label: "Viewer", icon: Eye },
];

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const currentRole = roles.find((r) => r.value === role) || roles[0];
  const Icon = currentRole.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-role-switcher">
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{currentRole.label}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {roles.map((r) => (
          <DropdownMenuItem
            key={r.value}
            onClick={() => setRole(r.value)}
            className="gap-2"
            data-testid={`role-option-${r.value}`}
          >
            <r.icon className="w-4 h-4" />
            <span>{r.label}</span>
            {r.value === role && <Check className="w-4 h-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
