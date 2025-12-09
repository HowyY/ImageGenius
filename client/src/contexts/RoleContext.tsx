import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "viewer" | "designer";

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isDesigner: boolean;
  isViewer: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const ROLE_STORAGE_KEY = "userRole";

function getStoredRole(): UserRole {
  if (typeof window === "undefined") {
    return "designer";
  }
  try {
    const stored = localStorage.getItem(ROLE_STORAGE_KEY);
    if (stored === "viewer" || stored === "designer") {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return "designer";
}

interface RoleProviderProps {
  children: ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [role, setRoleState] = useState<UserRole>(getStoredRole);

  useEffect(() => {
    localStorage.setItem(ROLE_STORAGE_KEY, role);
  }, [role]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
  };

  const value: RoleContextType = {
    role,
    setRole,
    isDesigner: role === "designer",
    isViewer: role === "viewer",
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
