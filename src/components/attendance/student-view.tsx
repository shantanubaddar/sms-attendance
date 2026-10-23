"use client";

import { useCallback, useEffect, useState } from "react";
import { GraduationCap, Loader2, RefreshCw, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { displayDate } from "@/lib/dates";
import { api } from "./api";
import type { AttStatus, SessionUser, StudentPortalData } from "./types";

const STATUS_STYLES: Record<AttStatus, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  ABSENT: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  LEAVE: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
};

function pctColor(pct: number | null): string {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 75) return "text-emerald-700 dark:text-emerald-300";
  if (pct >= 60) return "text-amber-600 dark:text-amber-300";
  return "text-red-600 dark:text-red-300";
}

export function StudentView({ user, refreshKey }: { user: SessionUser; refreshKey: number }) {
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api<StudentPortalData>("/api/me/student");
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your attendance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-destructive">{error || "Something went wrong"}</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const firstName = data.student.name.split(" ")[0];
  const maxTotal = Math.max(...data.months.map((m) => m.total), 1);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* greeting */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">Hi, {firstName}!</h1>
            <p className="text-xs text-muted-foreground">
              {data.student.admissionNo}
              {data.student.classSection
                ? ` · Class ${data.student.classSection.name}-${data.student.classSection.section}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">Today</span>
          {data.todayStatus ? (
            <Badge variant="outline" className={STATUS_STYLES[data.todayStatus]}>
              {data.todayStatus === "PRESENT"
                ? "Present today"
                : data.todayStatus === "ABSENT"
                  ? "Absent today"
                  : "On leave today"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not marked yet
            </Badge>
          )}
        </div>
      </div>

      {/* overall + month */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className={cn("text-4xl font-bold tabular-nums", pctColor(data.overall.pct))}>
                {data.overall.pct !== null ? `${data.overall.pct}%` : "—"}
              </p>
              <p className="pb-1 text-xs text-muted-foreground">
                of {data.overall.total} working {data.overall.total === 1 ? "day" : "days"}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 py-2 dark:border-emerald-800 dark:bg-emerald-950/40">
                <p className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {data.overall.present}
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">Present</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 py-2 dark:border-red-800 dark:bg-red-950/40">
                <p className="text-lg font-semibold tabular-nums text-red-700 dark:text-red-300">
                  {data.overall.absent}
                </p>
                <p className="text-[11px] text-red-700/80 dark:text-red-400">Absent</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 py-2 dark:border-amber-800 dark:bg-amber-950/40">
                <p className="text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                  {data.overall.leave}
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400">Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden="true" /> This month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className={cn("text-4xl font-bold tabular-nums", pctColor(data.thisMonth.pct))}>
                {data.thisMonth.pct !== null ? `${data.thisMonth.pct}%` : "—"}
              </p>
              <p className="pb-1 text-xs text-muted-foreground">
                {data.thisMonth.total} marked {data.thisMonth.total === 1 ? "day" : "days"} so far
              </p>
            </div>
            {/* last 6 months mini bars */}
            <div className="mt-4">
              <div className="flex h-20 items-end gap-2" role="img" aria-label="Attendance percentage for the last 6 months">
                {data.months.map((m) => (
                  <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-14 w-full items-end justify-center">
                      <div
                        className={cn(
                          "w-full max-w-7 rounded-t-md transition-all",
                          m.pct === null
                            ? "bg-muted"
                            : m.pct >= 75
                              ? "bg-sky-500/80"
                              : m.pct >= 60
                                ? "bg-amber-400/80"
                                : "bg-red-400/80"
                        )}
                        style={{ height: `${m.pct === null ? 4 : Math.max(6, m.pct)}%` }}
                        title={`${m.label}: ${m.pct !== null ? `${m.pct}%` : "no records"}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                Last 6 months · {data.thisMonth.present}P / {data.thisMonth.absent}A /{" "}
                {data.thisMonth.leave}L this month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* recent records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No attendance records yet.
            </p>
          ) : (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {data.recent.map((r) => (
                <li
                  key={r.date}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{displayDate(r.date)}</span>
                  <Badge variant="outline" className={STATUS_STYLES[r.status]}>
                    {r.status === "PRESENT" ? "Present" : r.status === "ABSENT" ? "Absent" : "Leave"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
