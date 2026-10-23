"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, UserCog, Layers, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "./api";
import type { ClassSection, Role, StaffUser, SubjectRow } from "./types";

interface UserForm {
  id?: string;
  username: string;
  name: string;
  role: Role;
  password: string;
  active: boolean;
}
interface ClassForm {
  id?: string;
  name: string;
  section: string;
}
interface SubjectForm {
  id?: string;
  name: string;
  code: string;
}

const EMPTY_USER: UserForm = { username: "", name: "", role: "TEACHER", password: "", active: true };
const EMPTY_CLASS: ClassForm = { name: "", section: "A" };
const EMPTY_SUBJECT: SubjectForm = { name: "", code: "" };

export function AdminView({ currentUserId, refreshKey }: { currentUserId: string; refreshKey: number }) {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [userDialog, setUserDialog] = useState(false);
  const [userForm, setUserForm] = useState<UserForm>(EMPTY_USER);
  const [userSaving, setUserSaving] = useState(false);
  const [userDelete, setUserDelete] = useState<StaffUser | null>(null);

  const [classDialog, setClassDialog] = useState(false);
  const [classForm, setClassForm] = useState<ClassForm>(EMPTY_CLASS);
  const [classSaving, setClassSaving] = useState(false);
  const [classDelete, setClassDelete] = useState<ClassSection | null>(null);

  const [subjectDialog, setSubjectDialog] = useState(false);
  const [subjectForm, setSubjectForm] = useState<SubjectForm>(EMPTY_SUBJECT);
  const [subjectSaving, setSubjectSaving] = useState(false);
  const [subjectDelete, setSubjectDelete] = useState<SubjectRow | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c, s] = await Promise.all([
        api<{ users: StaffUser[] }>("/api/users"),
        api<{ classes: ClassSection[] }>("/api/classes"),
        api<{ subjects: SubjectRow[] }>("/api/subjects"),
      ]);
      setUsers(u.users);
      setClasses(c.classes);
      setSubjects(s.subjects);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshKey]);

  // ---------- users ----------
  async function saveUser() {
    if (!userForm.name.trim() || !userForm.username.trim()) {
      toast.error("Username and name are required");
      return;
    }
    if (!userForm.id && userForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (userForm.id && userForm.password && userForm.password.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setUserSaving(true);
    try {
      if (userForm.id) {
        await api(`/api/users/${userForm.id}`, {
          method: "PUT",
          json: {
            name: userForm.name.trim(),
            role: userForm.role,
            active: userForm.active,
            ...(userForm.password ? { password: userForm.password } : {}),
          },
        });
        toast.success(`${userForm.name} updated`);
      } else {
        await api("/api/users", {
          method: "POST",
          json: {
            username: userForm.username.trim(),
            name: userForm.name.trim(),
            role: userForm.role,
            password: userForm.password,
          },
        });
        toast.success(`Account "${userForm.username}" created`);
      }
      setUserDialog(false);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save user");
    } finally {
      setUserSaving(false);
    }
  }

  async function deleteUser() {
    if (!userDelete) return;
    setUserSaving(true);
    try {
      await api(`/api/users/${userDelete.id}`, { method: "DELETE" });
      toast.success(`${userDelete.name} deleted`);
      setUserDelete(null);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete user");
    } finally {
      setUserSaving(false);
    }
  }

  // ---------- classes ----------
  async function saveClass() {
    if (!classForm.name.trim()) {
      toast.error("Class name is required (e.g. 6)");
      return;
    }
    setClassSaving(true);
    try {
      if (classForm.id) {
        await api(`/api/classes/${classForm.id}`, {
          method: "PUT",
          json: { name: classForm.name.trim(), section: classForm.section.trim() || "A" },
        });
        toast.success("Class updated");
      } else {
        await api("/api/classes", {
          method: "POST",
          json: { name: classForm.name.trim(), section: classForm.section.trim() || "A" },
        });
        toast.success("Class added");
      }
      setClassDialog(false);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save class");
    } finally {
      setClassSaving(false);
    }
  }

  async function deleteClass() {
    if (!classDelete) return;
    setClassSaving(true);
    try {
      await api(`/api/classes/${classDelete.id}`, { method: "DELETE" });
      toast.success(`Class ${classDelete.name}-${classDelete.section} deleted`);
      setClassDelete(null);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete class");
    } finally {
      setClassSaving(false);
    }
  }

  // ---------- subjects ----------
  async function saveSubject() {
    if (!subjectForm.name.trim()) {
      toast.error("Subject name is required");
      return;
    }
    setSubjectSaving(true);
    try {
      if (subjectForm.id) {
        await api(`/api/subjects/${subjectForm.id}`, {
          method: "PUT",
          json: { name: subjectForm.name.trim(), code: subjectForm.code.trim() || null },
        });
        toast.success("Subject updated");
      } else {
        await api("/api/subjects", {
          method: "POST",
          json: { name: subjectForm.name.trim(), code: subjectForm.code.trim() || null },
        });
        toast.success("Subject added");
      }
      setSubjectDialog(false);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save subject");
    } finally {
      setSubjectSaving(false);
    }
  }

  async function deleteSubject() {
    if (!subjectDelete) return;
    setSubjectSaving(true);
    try {
      await api(`/api/subjects/${subjectDelete.id}`, { method: "DELETE" });
      toast.success(`${subjectDelete.name} deleted`);
      setSubjectDelete(null);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete subject");
    } finally {
      setSubjectSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex h-10">
          <TabsTrigger value="users" className="gap-1.5">
            <UserCog className="h-4 w-4" aria-hidden="true" /> Users
          </TabsTrigger>
          <TabsTrigger value="classes" className="gap-1.5">Classes</TabsTrigger>
          <TabsTrigger value="subjects" className="gap-1.5">Subjects</TabsTrigger>
        </TabsList>

        {/* ---------- Users ---------- */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setUserForm(EMPTY_USER);
                setUserDialog(true);
              }}
              className="min-h-[44px]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add user
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs">{u.username}</TableCell>
                        <TableCell className="font-medium">
                          {u.name}
                          {u.id === currentUserId ? (
                            <span className="text-xs text-muted-foreground"> (you)</span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                            {u.role === "ADMIN" ? "Admin" : "Teacher"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {u.active ? (
                            <span className="text-xs text-emerald-700">Active</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Disabled</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Edit ${u.name}`}
                              onClick={() => {
                                setUserForm({
                                  id: u.id,
                                  username: u.username,
                                  name: u.name,
                                  role: u.role,
                                  password: "",
                                  active: u.active,
                                });
                                setUserDialog(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {u.id !== currentUserId ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                aria-label={`Delete ${u.name}`}
                                onClick={() => setUserDelete(u)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Classes ---------- */}
        <TabsContent value="classes" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setClassForm(EMPTY_CLASS);
                setClassDialog(true);
              }}
              className="min-h-[44px]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add class
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : classes.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" aria-hidden="true" />
                  No classes yet. Add classes like 1 to 10 with sections.
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-[1]">
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead className="text-center">Active students</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classes.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">Class {c.name}</TableCell>
                          <TableCell>{c.section}</TableCell>
                          <TableCell className="text-center tabular-nums">{c.studentCount ?? 0}</TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Edit class ${c.name}-${c.section}`}
                                onClick={() => {
                                  setClassForm({ id: c.id, name: c.name, section: c.section });
                                  setClassDialog(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                aria-label={`Delete class ${c.name}-${c.section}`}
                                onClick={() => setClassDelete(c)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Subjects ---------- */}
        <TabsContent value="subjects" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setSubjectForm(EMPTY_SUBJECT);
                setSubjectDialog(true);
              }}
              className="min-h-[44px]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add subject
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : subjects.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" aria-hidden="true" />
                  No subjects yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="font-mono text-xs">{s.code || "—"}</TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Edit subject ${s.name}`}
                              onClick={() => {
                                setSubjectForm({ id: s.id, name: s.name, code: s.code || "" });
                                setSubjectDialog(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              aria-label={`Delete subject ${s.name}`}
                              onClick={() => setSubjectDelete(s)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---------- User dialog ---------- */}
      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{userForm.id ? "Edit account" : "New account"}</DialogTitle>
            <DialogDescription>
              {userForm.id
                ? "Leave password blank to keep the current password."
                : "Create a login for a teacher or administrator."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="u-username">Username</Label>
              <Input
                id="u-username"
                value={userForm.username}
                disabled={!!userForm.id}
                onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="e.g. teacher3"
                autoCapitalize="none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Full name</Label>
              <Input
                id="u-name"
                value={userForm.name}
                onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Staff full name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-role">Role</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(v) => setUserForm((f) => ({ ...f, role: v as Role }))}
                >
                  <SelectTrigger id="u-role" aria-label="Select role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-password">
                  {userForm.id ? "New password (optional)" : "Password"}
                </Label>
                <Input
                  id="u-password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={userForm.id ? "Unchanged" : "Min. 6 characters"}
                  autoComplete="new-password"
                />
              </div>
            </div>
            {userForm.id ? (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Account enabled</p>
                  <p className="text-xs text-muted-foreground">Disabled accounts cannot sign in</p>
                </div>
                <Switch
                  checked={userForm.active}
                  aria-label="Account enabled"
                  onCheckedChange={(v) => setUserForm((f) => ({ ...f, active: v }))}
                />
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setUserDialog(false)} disabled={userSaving}>
              Cancel
            </Button>
            <Button onClick={saveUser} disabled={userSaving}>
              {userSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                </>
              ) : userForm.id ? (
                "Save changes"
              ) : (
                "Create account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Class dialog ---------- */}
      <Dialog open={classDialog} onOpenChange={setClassDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{classForm.id ? "Edit class" : "New class"}</DialogTitle>
            <DialogDescription>Example: Class “6”, Section “A”.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Class name</Label>
              <Input
                id="c-name"
                value={classForm.name}
                onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="6"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-section">Section</Label>
              <Input
                id="c-section"
                value={classForm.section}
                onChange={(e) => setClassForm((f) => ({ ...f, section: e.target.value.toUpperCase() }))}
                placeholder="A"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setClassDialog(false)} disabled={classSaving}>
              Cancel
            </Button>
            <Button onClick={saveClass} disabled={classSaving}>
              {classSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : classForm.id ? "Save changes" : "Add class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Subject dialog ---------- */}
      <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{subjectForm.id ? "Edit subject" : "New subject"}</DialogTitle>
            <DialogDescription>Example: “Mathematics” with code “MAT”.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Subject name</Label>
              <Input
                id="s-name"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Mathematics"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-code">Code (optional)</Label>
              <Input
                id="s-code"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="MAT"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSubjectDialog(false)} disabled={subjectSaving}>
              Cancel
            </Button>
            <Button onClick={saveSubject} disabled={subjectSaving}>
              {subjectSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : subjectForm.id ? "Save changes" : "Add subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Delete confirmations ---------- */}
      <AlertDialog open={!!userDelete} onOpenChange={(o) => !o && setUserDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account “{userDelete?.username}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {userDelete?.name} will no longer be able to sign in. Past attendance records are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={userSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                deleteUser();
              }}
              disabled={userSaving}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!classDelete} onOpenChange={(o) => !o && setClassDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Class {classDelete?.name}-{classDelete?.section}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Classes with assigned students cannot be deleted. Move or remove those students first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={classSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                deleteClass();
              }}
              disabled={classSaving}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!subjectDelete} onOpenChange={(o) => !o && setSubjectDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subject “{subjectDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={subjectSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                deleteSubject();
              }}
              disabled={subjectSaving}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
