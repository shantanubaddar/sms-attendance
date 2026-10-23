"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, CheckCheck, UsersRound, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "./api";
import type { AttStatus, ClassSection, RosterStudent } from "./types";
import { todayStr, isWeekend, displayDate } from "@/lib/dates";

interface RosterData {
  classSection: { id: string; name: string; section: string };
  date: string;
  alreadyMarked: boolean;
  students: RosterStudent[];
}

const STATUS_ORDER: AttStatus[] = ["PRESENT", "ABSENT", "LEAVE"];
const STATUS_BTN: Record<AttStatus, { label: string; short: string; active: string }> = {
  PRESENT: { label: "Present", short: "P", active: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700" },
  ABSENT: { label: "Absent", short: "A", active: "bg-red-600 text-white border-red-600 hover:bg-red-700" },
  LEAVE: { label: "Leave", short: "L", active: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600" },
};

export function AttendanceView({ refreshKey }: { refreshKey: number }) {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [roster, setRoster] = useState<RosterData | null>(null);
  const [marks, setMarks] = useState<Record<string, AttStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ classes: ClassSection[] }>("/api/classes")
      .then((d) => {
        setClasses(d.classes);
        if (d.classes.length > 0) {
          setClassId((prev) => prev || d.classes[0].id);
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load classes"));
  }, [refreshKey]);

  const loadRoster = useCallback(async (cid: string, d: string, keepMarks: boolean) => {
    if (!cid || !d) return;
    setLoading(true);
    try {
      const data = await api<RosterData>(
        `/api/attendance?classId=${encodeURIComponent(cid)}&date=${encodeURIComponent(d)}`
      );
      setRoster(data);
      if (!keepMarks) {
        const initial: Record<string, AttStatus> = {};
        for (const s of data.students) initial[s.id] = s.status ?? "PRESENT";
        setMarks(initial);
      }
    } catch (e) {
      setRoster(null);
      toast.error(e instanceof Error ? e.message : "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoster(classId, date, false);
  }, [classId, date, loadRoster, refreshKey]);

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LEAVE: 0 };
    for (const s of roster?.students ?? []) {
      const st = marks[s.id];
      if (st) c[st] += 1;
    }
    return c;
  }, [roster, marks]);

  function setAll(status: AttStatus) {
    if (!roster) return;
    const next: Record<string, AttStatus> = {};
    for (const s of roster.students) next[s.id] = status;
    setMarks(next);
  }

  async function save() {
    if (!roster) return;
    setSaving(true);
    try {
      const records = roster.students.map((s) => ({ studentId: s.id, status: marks[s.id] }));
      await api("/api/attendance", {
        method: "POST",
        json: { classId: roster.classSection.id, date: roster.date, records },
      });
      toast.success(
        `Attendance saved for Class ${roster.classSection.name}-${roster.classSection.section} · ${displayDate(roster.date)}`,
        { description: `${counts.PRESENT} present · ${counts.ABSENT} absent · ${counts.LEAVE} on leave` }
      );
      await loadRoster(roster.classSection.id, roster.date, true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save attendance");
    } finally {
      setSaving(false);
    }
  }

  const total = roster?.students.length ?? 0;

  return (
    <div className="space-y-4 pb-24">
      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="class-select" className="text-xs text-muted-foreground">
              Class
            </Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger id="class-select" className="w-full min-h-[44px]" aria-label="Select class">
                <SelectValue placeholder={classes.length === 0 ? "No classes yet" : "Select class"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    Class {c.name}-{c.section} ({c.studentCount ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date-input" className="text-xs text-muted-foreground">
              Date
            </Label>
            <div className="relative">
              <CalendarDays
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="date-input"
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) setDate(v);
                }}
                className="pl-9 min-h-[44px]"
              />
            </div>
          </div>
          {isWeekend(date) ? (
            <p className="sm:col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              You have selected a Sunday/Saturday — usually a holiday for the school.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : !roster || roster.students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UsersRound className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {classes.length === 0
                ? "No classes have been created yet. An administrator can add classes under Manage."
                : "No active students in this class. Add students from the Students tab."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4 border-b bg-muted/30 rounded-t-xl">
              <div className="text-sm">
                <span className="font-medium">
                  Class {roster.classSection.name}-{roster.classSection.section}
                </span>
                <span className="text-muted-foreground"> · {total} students</span>
                {roster.alreadyMarked ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    <CheckCheck className="h-3 w-3" aria-hidden="true" /> Already marked — editing
                  </span>
                ) : null}
              </div>
              <Button variant="outline" size="sm" onClick={() => setAll("PRESENT")} className="min-h-[36px]">
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all present
              </Button>
            </div>

            <ul className="divide-y max-h-[52vh] overflow-y-auto" aria-label="Student attendance list">
              {roster.students.map((s, idx) => (
                <li key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 sm:px-4 py-2.5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground w-6 text-right shrink-0 tabular-nums">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground">{s.admissionNo}</p>
                    </div>
                  </div>
                  <div
                    role="radiogroup"
                    aria-label={`Attendance for ${s.name}`}
                    className="flex gap-1.5 shrink-0"
                  >
                    {STATUS_ORDER.map((st) => {
                      const cfg = STATUS_BTN[st];
                      const selected = marks[s.id] === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setMarks((m) => ({ ...m, [s.id]: st }))}
                          className={cn(
                            "h-10 sm:h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                            selected
                              ? cfg.active
                              : "bg-background text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <span className="sm:hidden font-bold">{cfg.short}</span>
                          <span className="hidden sm:inline">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Sticky save bar */}
      {roster && roster.students.length > 0 ? (
        <div className="sticky bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="mx-auto max-w-6xl px-3 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm flex-1">
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
                {counts.PRESENT} present
              </span>
              <span className="inline-flex items-center gap-1.5 text-red-600">
                <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
                {counts.ABSENT} absent
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-600">
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                {counts.LEAVE} leave
              </span>
            </div>
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto min-h-[44px]">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                </>
              ) : (
                "Save attendance"
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
