"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

export function ThemeToggle({
  label,
  lightLabel,
  darkLabel,
  systemLabel,
  className,
}: {
  label: string;
  lightLabel: string;
  darkLabel: string;
  systemLabel: string;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToClientReady,
    getClientSnapshot,
    getServerSnapshot,
  );

  const currentTheme = ((mounted ? theme : "system") ?? "system") as ThemeMode;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/80 bg-card/88 p-1 shadow-sm shadow-slate-950/4",
        className,
      )}
      aria-label={label}
    >
      <ThemeButton
        active={currentTheme === "light"}
        label={lightLabel}
        onClick={() => setTheme("light")}
      >
        <Sun className="size-3.5" />
      </ThemeButton>
      <ThemeButton
        active={currentTheme === "dark"}
        label={darkLabel}
        onClick={() => setTheme("dark")}
      >
        <Moon className="size-3.5" />
      </ThemeButton>
      <ThemeButton
        active={currentTheme === "system"}
        label={systemLabel}
        onClick={() => setTheme("system")}
      >
        <Monitor className="size-3.5" />
      </ThemeButton>
    </div>
  );
}

function subscribeToClientReady() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function ThemeButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="icon-sm"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-full",
        !active && "text-foreground/70 hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </Button>
  );
}
