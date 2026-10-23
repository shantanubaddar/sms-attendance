"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Plus, Pencil, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "./api";
import type { ClassSection, StudentRow } from "./types";
import { classLabel } from "./types";
import { cn } from "@/lib/utils";

interface StudentFormState {
  id?: string;
  admissionNo: string;
  name: string;
  gender: string;
  guardianName: string;
  contact: string;
  classSectionId: string;
  active: boolean;
}

const EMPTY_FORM: StudentFormState = {
  admissionNo: "",
  name: "",
  gender: "",
  guardianName: "",
  contact: "",
  classSectionId: "",
  active: true,
};

function PctBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">No data</span>;
  const cls =
    pct >= 75
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : pct >= 50
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";
  return (
    <Badge variant="outline" className={cn("tabular-nums", cls)}>
      {pct}%
    </Badge>
  );
}

export function StudentsView({ isAdmin, refreshKey }: { isAdmin: boolean; refreshKey: number }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<StudentFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (classId && classId !== "all") params.set("classId", classId);
      const [s, c] = await Promise.all([
        api<{ students: StudentRow[] }>(`/api/students?${params.toString()}`),
        api<{ classes: ClassSection[] }>("/api/classes"),
      ]);
      setStudents(s.students);
      setClasses(c.classes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [search, classId]);

  // debounce search a little
  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const filtered = useMemo(
    () => (classId === "all" ? students : students.filter((s) => s.classSectionId === classId)),
    [students, classId]
  );

  function openAdd() {
    setForm({ ...EMPTY_FORM, classSectionId: classes[0]?.id || "", admissionNo: "" });
    setDialogOpen(true);
  }

  function openEdit(s: StudentRow) {
    setForm({
      id: s.id,
      admissionNo: s.admissionNo,
      name: s.name,
      gender: s.gender || "",
      guardianName: s.guardianName || "",
      contact: s.contact || "",
      classSectionId: s.classSectionId || "",
      active: s.active,
    });
    setDialogOpen(true);
  }

  async function saveStudent() {
    if (!form.admissionNo.trim() || !form.name.trim()) {
      toast.error("Admission number and name are required");
      return;
    }
    if (!form.classSectionId) {
      toast.error("Please select a class");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        admissionNo: form.admissionNo.trim(),
        name: form.name.trim(),
        gender: form.gender || null,
        guardianName: form.guardianName.trim() || null,
        contact: form.contact.trim() || null,
        classSectionId: form.classSectionId,
        active: form.active,
      };
      if (form.id) {
        await api(`/api/students/${form.id}`, { method: "PUT", json: payload });
        toast.success(`${payload.name} updated`);
      } else {
        await api("/api/students", { method: "POST", json: payload });
        toast.success(`${payload.name} added`);
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save student");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/students/${deleteTarget.id}`, { method: "DELETE" });
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete student");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search by name or admission number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 min-h-[44px]"
            aria-label="Search students"
          />
        </div>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-full sm:w-48 min-h-[44px]" aria-label="Filter by class">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                Class {c.name}-{c.section}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin ? (
          <Button onClick={openAdd} className="min-h-[44px]">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add Student
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && students.length === 0 ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <UserRound className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {search || classId !== "all"
                  ? "No students match your search or filter."
                  : "No students yet. Add the first student to get started."}
              </p>
            </div>
          ) : (
            <div className="max-h-[64vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-[1]">
                  <TableRow>
                    <TableHead>Adm. No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Class</TableHead>
                    <TableHead className="hidden md:table-cell">Guardian</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead>Attendance</TableHead>
                    {isAdmin ? <TableHead className="text-right pr-4">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id} className={cn(!s.active && "opacity-60")}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{s.admissionNo}</TableCell>
                      <TableCell>
                        <span className="font-medium">{s.name}</span>
                        {!s.active ? (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            Inactive
                          </Badge>
                        ) : null}
                        <span className="sm:hidden block text-xs text-muted-foreground">
                          {classLabel(s.classSection)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell whitespace-nowrap">
                        {classLabel(s.classSection)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-36 truncate">
                        {s.guardianName || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell whitespace-nowrap">
                        {s.contact || "—"}
                      </TableCell>
                      <TableCell>
                        <PctBadge pct={s.pct ?? null} />
                      </TableCell>
                      {isAdmin ? (
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(s)}
                              aria-label={`Edit ${s.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(s)}
                              aria-label={`Delete ${s.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {filtered.length > 0 ? (
            <div className="border-t px-4 py-2 text-xs text-muted-foreground">
              {filtered.length} student{filtered.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit student" : "Add student"}</DialogTitle>
            <DialogDescription>
              {form.id
                ? "Update the student's details below."
                : "Enter the new student's details. Fields marked * are required."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-adm">Admission No *</Label>
                <Input
                  id="f-adm"
                  value={form.admissionNo}
                  onChange={(e) => setForm((f) => ({ ...f, admissionNo: e.target.value }))}
                  placeholder="SMS0001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-class">Class *</Label>
                <Select
                  value={form.classSectionId}
                  onValueChange={(v) => setForm((f) => ({ ...f, classSectionId: v }))}
                >
                  <SelectTrigger id="f-class" aria-label="Select class">
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-name">Full name *</Label>
              <Input
                id="f-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Student full name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-gender">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                  <SelectTrigger id="f-gender" aria-label="Select gender">
                    <SelectValue placeholder="Not specified" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-contact">Contact number</Label>
                <Input
                  id="f-contact"
                  inputMode="tel"
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                  placeholder="9876543210"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-guardian">Guardian name</Label>
              <Input
                id="f-guardian"
                value={form.guardianName}
                onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))}
                placeholder="Parent / guardian name"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="f-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v === true }))}
              />
              <Label htmlFor="f-active" className="font-normal text-sm">
                Active student (appears in attendance lists)
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveStudent} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                </>
              ) : form.id ? (
                "Save changes"
              ) : (
                "Add student"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the student and all of their attendance records. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete student"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
