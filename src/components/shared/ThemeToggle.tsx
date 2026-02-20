/*
 * 3DPricey
 * Copyright (C) 2025 Printel
 */

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="h-9 w-9 px-0 bg-background hover:bg-muted text-foreground border-input transition-colors duration-200 relative overflow-hidden group"
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {/* Light mode icon */}
      <Sun
        className={`h-4 w-4 absolute transition-all duration-300 ${
          theme === "light"
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
      {/* Dark mode icon */}
      <Moon
        className={`h-4 w-4 absolute transition-all duration-300 ${
          theme === "dark"
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0"
        }`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};
