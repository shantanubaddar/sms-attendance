"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Layers,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  CheckCircle2,
  XCircle,
  PauseCircle,
  CircleDashed,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "./api";
import type { DashboardData, SessionUser } from "./types";
import { displayDate } from "@/lib/dates";

export function DashboardView({
  user,
  onGoAttendance,
  onGoReports,
  refreshKey,
}: {
  user: SessionUser;
  onGoAttendance: () => void;
  onGoReports: () => void;
  refreshKey: number;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<DashboardData>("/api/dashboard"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <Button variant="outline" onClick={load}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const ta = data.todayAttendance;
  const markedPct = data.stats.students > 0 ? Math.round((ta.marked / data.stats.students) * 100) : 0;

  const statCards = [
    { label: "Students", value: data.stats.students, icon: Users },
    { label: "Classes", value: data.stats.classes, icon: Layers },
    { label: "Teachers", value: data.stats.teachers, icon: GraduationCap },
    { label: "Subjects", value: data.stats.subjects, icon: BookOpen },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              {greeting}, {user.name.split(" ")[0]}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {displayDate(data.today)} · Here is today&apos;s attendance overview
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onGoAttendance} className="flex-1 sm:flex-none">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Mark Attendance
            </Button>
            <Button variant="outline" onClick={onGoReports} className="flex-1 sm:flex-none">
              <BarChart3 className="h-4 w-4" aria-hidden="true" /> Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Today&apos;s Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ta.marked === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CircleDashed className="h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground mb-3">
                Attendance has not been marked for today yet.
              </p>
              <Button size="sm" onClick={onGoAttendance}>
                Mark attendance now
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-medium">Present</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{ta.present}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 text-red-600">
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-medium">Absent</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{ta.absent}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <PauseCircle className="h-4 w-4" aria-hidden="true" />
                    <span className="text-xs font-medium">On Leave</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{ta.leave}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>
                    Marked {ta.marked} of {data.stats.students} students
                    {ta.unmarked > 0 ? ` · ${ta.unmarked} remaining` : " · complete"}
                  </span>
                  <span className="font-medium text-foreground">
                    {ta.pct !== null ? `${ta.pct}% present` : ""}
                  </span>
                </div>
                <Progress value={markedPct} aria-label={`${markedPct}% of students marked`} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
