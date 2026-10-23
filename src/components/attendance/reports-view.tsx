"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Download, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "./api";
import type { AttStatus, ClassSection, ClassReportRow, StudentRow } from "./types";
import {
  daysAgoStr,
  displayDate,
  startOfMonthStr,
  startOfWeekStr,
  todayStr,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<AttStatus, string> = {
  PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ABSENT: "bg-red-50 text-red-700 border-red-200",
  LEAVE: "bg-amber-50 text-amber-700 border-amber-200",
};
const STATUS_WORD: Record<AttStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LEAVE: "Leave",
};

function DateRangeFields({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input type="date" value={from} max={todayStr()} onChange={(e) => e.target.value && onFrom(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input type="date" value={to} max={todayStr()} onChange={(e) => e.target.value && onTo(e.target.value)} />
      </div>
      <div className="col-span-2 sm:col-span-1 flex flex-wrap gap-1.5 items-end">
        <Button variant="outline" size="sm" className="h-9" onClick={() => { onFrom(startOfWeekStr()); onTo(todayStr()); }}>
          This week
        </Button>
        <Button variant="outline" size="sm" className="h-9" onClick={() => { onFrom(startOfMonthStr()); onTo(todayStr()); }}>
          This month
        </Button>
        <Button variant="outline" size="sm" className="h-9" onClick={() => { onFrom(daysAgoStr(29)); onTo(todayStr()); }}>
          Last 30 days
        </Button>
      </div>
    </>
  );
}

function pctClass(pct: number | null): string {
  if (pct === null) return "";
  if (pct >= 75) return "text-emerald-700";
  if (pct >= 50) return "text-amber-600";
  return "text-red-600";
}

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ClassReportData {
  classSection: { id: string; name: string; section: string };
  from: string;
  to: string;
  markedDays: number;
  rows: ClassReportRow[];
  summary: { students: number; present: number; absent: number; leave: number; pct: number | null };
}

interface StudentReportData {
  student: { id: string; admissionNo: string; name: string; classSection: { name: string; section: string } | null };
  records: { date: string; status: string }[];
  summary: { present: number; absent: number; leave: number; total: number; pct: number | null };
}

interface DailyReportData {
  date: string;
  rows: {
    id: string;
    name: string;
    section: string;
    strength: number;
    present: number;
    absent: number;
    leave: number;
    unmarked: number;
    pct: number | null;
  }[];
  totals: { strength: number; present: number; absent: number; leave: number; unmarked: number };
}

export function ReportsView({ refreshKey }: { refreshKey: number }) {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  // class report state
  const [crClassId, setCrClassId] = useState("");
  const [crFrom, setCrFrom] = useState(startOfMonthStr());
  const [crTo, setCrTo] = useState(todayStr());
  const [crData, setCrData] = useState<ClassReportData | null>(null);
  const [crLoading, setCrLoading] = useState(false);

  // student report state
  const [srClassId, setSrClassId] = useState("");
  const [srStudentId, setSrStudentId] = useState("");
  const [srFrom, setSrFrom] = useState(startOfMonthStr());
  const [srTo, setSrTo] = useState(todayStr());
  const [srData, setSrData] = useState<StudentReportData | null>(null);
  const [srLoading, setSrLoading] = useState(false);

  // daily report state
  const [drDate, setDrDate] = useState(todayStr());
  const [drData, setDrData] = useState<DailyReportData | null>(null);
  const [drLoading, setDrLoading] = useState(false);

  const loadClassStudents = useCallback(
    async (classId: string) => {
      setSrStudentId("");
      if (!classId) {
        setStudents([]);
        return;
      }
      try {
        const d = await api<{ students: StudentRow[] }>(
          `/api/students?classId=${encodeURIComponent(classId)}`
        );
        setStudents(d.students);
      } catch {
        setStudents([]);
      }
    },
    []
  );

  useEffect(() => {
    api<{ classes: ClassSection[] }>("/api/classes")
      .then((d) => {
        setClasses(d.classes);
        const first = d.classes[0]?.id || "";
        setCrClassId((p) => p || first);
        setSrClassId((p) => p || first);
        if (first) void loadClassStudents(first);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load classes"));
  }, [refreshKey, loadClassStudents]);

  const generateClassReport = useCallback(async () => {
    if (!crClassId || !crFrom || !crTo) return;
    if (crFrom > crTo) {
      toast.error("'From' date must be before 'To' date");
      return;
    }
    setCrLoading(true);
    setCrData(null);
    try {
      const d = await api<ClassReportData>(
        `/api/reports/class?classId=${encodeURIComponent(crClassId)}&from=${crFrom}&to=${crTo}`
      );
      setCrData(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate report");
    } finally {
      setCrLoading(false);
    }
  }, [crClassId, crFrom, crTo]);

  const generateStudentReport = useCallback(async () => {
    if (!srStudentId || !srFrom || !srTo) return;
    if (srFrom > srTo) {
      toast.error("'From' date must be before 'To' date");
      return;
    }
    setSrLoading(true);
    setSrData(null);
    try {
      const d = await api<StudentReportData>(
        `/api/reports/student?studentId=${encodeURIComponent(srStudentId)}&from=${srFrom}&to=${srTo}`
      );
      setSrData(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate report");
    } finally {
      setSrLoading(false);
    }
  }, [srStudentId, srFrom, srTo]);

  const generateDailyReport = useCallback(async () => {
    if (!drDate) return;
    setDrLoading(true);
    setDrData(null);
    try {
      const d = await api<DailyReportData>(`/api/reports/daily?date=${drDate}`);
      setDrData(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate report");
    } finally {
      setDrLoading(false);
    }
  }, [drDate]);

  const crSummaryPct = crData?.summary.pct ?? null;
  const exportClassCsv = useMemo(
    () => () => {
      if (!crData) return;
      const rows: (string | number | null)[][] = [
        ["Sankar Matriculation School - Class Attendance Report"],
        [`Class: ${crData.classSection.name}-${crData.classSection.section}`],
        [`Period: ${crData.from} to ${crData.to}`, `Marked days: ${crData.markedDays}`],
        [],
        ["Admission No", "Name", "Present", "Absent", "Leave", "Total Days", "Percentage %"],
        ...crData.rows.map((r) => [r.admissionNo, r.name, r.present, r.absent, r.leave, r.total, r.pct]),
        [],
        ["Summary", "", crData.summary.present, crData.summary.absent, crData.summary.leave, "", crData.summary.pct],
      ];
      downloadCsv(
        `attendance-class-${crData.classSection.name}${crData.classSection.section}-${crData.from}-to-${crData.to}.csv`,
        rows
      );
      toast.success("CSV report downloaded");
    },
    [crData]
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="class" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex h-10">
          <TabsTrigger value="class" className="gap-1.5">
            <BarChart3 className="h-4 w-4" aria-hidden="true" /> Class
          </TabsTrigger>
          <TabsTrigger value="student" className="gap-1.5">Student</TabsTrigger>
          <TabsTrigger value="daily" className="gap-1.5">Daily</TabsTrigger>
        </TabsList>

        {/* ------- Class report ------- */}
        <TabsContent value="class" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 items-start">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Class</Label>
                <Select value={crClassId} onValueChange={setCrClassId}>
                  <SelectTrigger aria-label="Select class" className="min-h-[44px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        Class {c.name}-{c.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DateRangeFields from={crFrom} to={crTo} onFrom={setCrFrom} onTo={setCrTo} />
              <div className="col-span-2 sm:col-span-1 flex gap-2 items-end sm:justify-end">
                <Button onClick={generateClassReport} disabled={crLoading || !crClassId} className="min-h-[44px] flex-1 sm:flex-none">
                  {crLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Generate"}
                </Button>
                {crData ? (
                  <Button variant="outline" onClick={exportClassCsv} className="min-h-[44px]">
                    <Download className="h-4 w-4" aria-hidden="true" /> CSV
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {crLoading ? (
            <Card>
              <CardContent className="p-4 space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </CardContent>
            </Card>
          ) : crData ? (
            <Card>
              <CardContent className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4 border-b bg-muted/30 rounded-t-xl">
                  <div className="text-sm">
                    <span className="font-medium">
                      Class {crData.classSection.name}-{crData.classSection.section}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}· {displayDate(crData.from)} → {displayDate(crData.to)} · {crData.markedDays} marked day
                      {crData.markedDays === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Badge variant="outline" className={cn(pctClass(crSummaryPct))}>
                    Overall {crSummaryPct !== null ? `${crSummaryPct}%` : "no data"}
                  </Badge>
                </div>
                <div className="max-h-[56vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-[1]">
                      <TableRow>
                        <TableHead>Adm. No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-center">P</TableHead>
                        <TableHead className="text-center">A</TableHead>
                        <TableHead className="text-center">L</TableHead>
                        <TableHead className="text-center">Days</TableHead>
                        <TableHead className="text-right pr-4">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {crData.rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.admissionNo}</TableCell>
                          <TableCell className="font-medium max-w-40 truncate">{r.name}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.present}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.absent}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.leave}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.total}</TableCell>
                          <TableCell className={cn("text-right pr-4 font-medium tabular-nums", pctClass(r.pct))}>
                            {r.pct !== null ? `${r.pct}%` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Select a class and date range, then press <span className="font-medium">Generate</span>.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ------- Student report ------- */}
        <TabsContent value="student" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 items-start">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Class</Label>
                <Select
                  value={srClassId}
                  onValueChange={(v) => {
                    setSrClassId(v);
                    loadClassStudents(v);
                  }}
                >
                  <SelectTrigger aria-label="Select class" className="min-h-[44px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        Class {c.name}-{c.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Student</Label>
                <Select value={srStudentId} onValueChange={setSrStudentId}>
                  <SelectTrigger aria-label="Select student" className="min-h-[44px]">
                    <SelectValue placeholder={students.length ? "Select student" : "Pick class first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.admissionNo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DateRangeFields from={srFrom} to={srTo} onFrom={setSrFrom} onTo={setSrTo} />
              <div className="col-span-2 sm:col-span-1 flex items-end sm:justify-end">
                <Button
                  onClick={generateStudentReport}
                  disabled={srLoading || !srStudentId}
                  className="min-h-[44px] w-full sm:w-auto"
                >
                  {srLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Generate"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {srLoading ? (
            <Card>
              <CardContent className="p-4 space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </CardContent>
            </Card>
          ) : srData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Student</p>
                    <p className="font-semibold truncate mt-1">{srData.student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {srData.student.admissionNo}
                      {srData.student.classSection ? ` · Class ${srData.student.classSection.name}-${srData.student.classSection.section}` : ""}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Present / Total</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums">
                      {srData.summary.present}
                      <span className="text-sm font-normal text-muted-foreground"> / {srData.summary.total}</span>
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Absent / Leave</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums">
                      {srData.summary.absent}
                      <span className="text-sm font-normal text-muted-foreground"> / {srData.summary.leave}</span>
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Attendance %</p>
                    <p className={cn("text-2xl font-bold mt-1 tabular-nums", pctClass(srData.summary.pct))}>
                      {srData.summary.pct !== null ? `${srData.summary.pct}%` : "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="p-3 sm:px-4 border-b bg-muted/30 rounded-t-xl text-sm text-muted-foreground">
                    {displayDate(srData.from)} → {displayDate(srData.to)} · {srData.records.length} record
                    {srData.records.length === 1 ? "" : "s"} (latest first)
                  </div>
                  <div className="max-h-[48vh] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-[1]">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {srData.records.map((r) => (
                          <TableRow key={r.date}>
                            <TableCell>{displayDate(r.date)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_BADGE[r.status as AttStatus]}>
                                {STATUS_WORD[r.status as AttStatus]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Pick a class and a student, then press <span className="font-medium">Generate</span>.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ------- Daily summary ------- */}
        <TabsContent value="daily" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 items-start">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={drDate} max={todayStr()} onChange={(e) => e.target.value && setDrDate(e.target.value)} />
              </div>
              <div className="col-span-2 sm:col-span-3 flex items-end sm:justify-end">
                <Button onClick={generateDailyReport} disabled={drLoading} className="min-h-[44px] w-full sm:w-auto">
                  {drLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Generate"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {drLoading ? (
            <Card>
              <CardContent className="p-4 space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </CardContent>
            </Card>
          ) : drData ? (
            <Card>
              <CardContent className="p-0">
                <div className="p-3 sm:px-4 border-b bg-muted/30 rounded-t-xl text-sm">
                  <span className="font-medium">{displayDate(drDate)}</span>
                  <span className="text-muted-foreground"> · whole school summary</span>
                </div>
                <div className="max-h-[56vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-[1]">
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-center">Strength</TableHead>
                        <TableHead className="text-center">P</TableHead>
                        <TableHead className="text-center">A</TableHead>
                        <TableHead className="text-center">L</TableHead>
                        <TableHead className="text-center">Unmarked</TableHead>
                        <TableHead className="text-right pr-4">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drData.rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            Class {r.name}-{r.section}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{r.strength}</TableCell>
                          <TableCell className="text-center tabular-nums text-emerald-700">{r.present}</TableCell>
                          <TableCell className="text-center tabular-nums text-red-600">{r.absent}</TableCell>
                          <TableCell className="text-center tabular-nums text-amber-600">{r.leave}</TableCell>
                          <TableCell className="text-center tabular-nums text-muted-foreground">
                            {r.unmarked > 0 ? r.unmarked : "—"}
                          </TableCell>
                          <TableCell className={cn("text-right pr-4 font-medium tabular-nums", pctClass(r.pct))}>
                            {r.pct !== null ? `${r.pct}%` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-center tabular-nums">{drData.totals.strength}</TableCell>
                        <TableCell className="text-center tabular-nums">{drData.totals.present}</TableCell>
                        <TableCell className="text-center tabular-nums">{drData.totals.absent}</TableCell>
                        <TableCell className="text-center tabular-nums">{drData.totals.leave}</TableCell>
                        <TableCell className="text-center tabular-nums">{drData.totals.unmarked}</TableCell>
                        <TableCell className="pr-4" />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Choose a date and press <span className="font-medium">Generate</span> to see the whole-school summary.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
