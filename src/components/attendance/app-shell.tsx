"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  LogOut,
  LayoutDashboard,
  ClipboardCheck,
  Users,
  BarChart3,
  Settings,
  GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { displayDate, todayStr } from "@/lib/dates";
import type { SessionUser } from "./types";

export type ViewKey = "dashboard" | "attendance" | "students" | "reports" | "admin";

const STAFF_NAV: { key: ViewKey; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "attendance", label: "Mark Attendance", icon: ClipboardCheck },
  { key: "students", label: "Students", icon: Users },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "admin", label: "Manage", icon: Settings, adminOnly: true },
];

const STUDENT_NAV: { key: ViewKey; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "My Attendance", icon: GraduationCap },
];

export function AppShell({
  user,
  view,
  onViewChange,
  onLogout,
  children,
}: {
  user: SessionUser;
  view: ViewKey;
  onViewChange: (v: ViewKey) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const items = useMemo(() => {
    if (user.role === "STUDENT") return STUDENT_NAV;
    return STAFF_NAV.filter((n) => !n.adminOnly || user.role === "ADMIN");
  }, [user.role]);
  const initials = useMemo(
    () =>
      user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || user.username[0].toUpperCase(),
    [user]
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-6xl w-full px-3 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Image
                src="/logo-mark.png"
                alt="Sankar Matriculation School logo"
                width={36}
                height={36}
                priority
                className="h-9 w-9 object-contain shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">
                  Sankar Matriculation School
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">
                  Online Attendance Management System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2 text-right">
                <div>
                  <p className="text-sm font-medium leading-tight">{user.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {displayDate(todayStr())}
                  </p>
                </div>
              </div>
              <Badge
                variant={user.role === "ADMIN" ? "default" : "secondary"}
                className={cn(
                  "shrink-0",
                  user.role === "TEACHER" &&
                    "border border-lime-600/40 bg-lime-600/10 text-lime-700 dark:text-lime-300",
                  user.role === "STUDENT" &&
                    "border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                )}
              >
                {user.role === "ADMIN" ? "Admin" : user.role === "TEACHER" ? "Teacher" : "Student"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                aria-label="Sign out"
                title="Sign out"
                className="shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto pb-2 -mb-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onViewChange(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm whitespace-nowrap transition-colors min-h-[36px]",
                    active
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="mx-auto max-w-6xl w-full px-3 sm:px-6 py-4 sm:py-6">{children}</div>
      </main>

      <footer className="mt-auto border-t bg-muted/30">
        <div className="mx-auto max-w-6xl w-full px-3 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground">
          <p>Sankar Matriculation School — Sankagiri West, Namakkal District</p>
          <p>Attendance Management System · v1.0</p>
        </div>
      </footer>
    </div>
  );
}
