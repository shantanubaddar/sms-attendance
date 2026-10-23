"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell, type ViewKey } from "@/components/attendance/app-shell";
import { LoginView } from "@/components/attendance/login-view";
import { DashboardView } from "@/components/attendance/dashboard-view";
import { AttendanceView } from "@/components/attendance/attendance-view";
import { StudentsView } from "@/components/attendance/students-view";
import { ReportsView } from "@/components/attendance/reports-view";
import { AdminView } from "@/components/attendance/admin-view";
import { StudentView } from "@/components/attendance/student-view";
import { api } from "@/components/attendance/api";
import type { SessionUser } from "@/components/attendance/types";

export default function Page() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState<ViewKey>("dashboard");
  // bump to refresh data across views after important changes (e.g. admin edits)
  const [refreshKey, setRefreshKey] = useState(0);

  const checkSession = useCallback(async () => {
    try {
      const data = await api<{ user: SessionUser }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  async function handleLogout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors on logout — clear locally anyway
    }
    setUser(null);
    setView("dashboard");
  }

  function handleViewChange(v: ViewKey) {
    setView(v);
    setRefreshKey((k) => k + 1);
  }

  if (booting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading attendance system…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        onLogin={(u) => {
          setUser(u);
          setView("dashboard");
          setRefreshKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <AppShell user={user} view={view} onViewChange={handleViewChange} onLogout={handleLogout}>
      {user.role === "STUDENT" ? (
        <StudentView user={user} refreshKey={refreshKey} />
      ) : view === "dashboard" ? (
        <DashboardView
          user={user}
          refreshKey={refreshKey}
          onGoAttendance={() => handleViewChange("attendance")}
          onGoReports={() => handleViewChange("reports")}
        />
      ) : view === "attendance" ? (
        <AttendanceView refreshKey={refreshKey} />
      ) : view === "students" ? (
        <StudentsView isAdmin={user.role === "ADMIN"} refreshKey={refreshKey} />
      ) : view === "reports" ? (
        <ReportsView refreshKey={refreshKey} />
      ) : (
        <AdminView currentUserId={user.id} refreshKey={refreshKey} />
      )}
    </AppShell>
  );
}
