"use client";

import { useState } from "react";
import Image from "next/image";
import {
  GraduationCap,
  ShieldCheck,
  BookOpenCheck,
  Loader2,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "./api";
import type { SessionUser } from "./types";

type PortalKey = "STUDENT" | "ADMIN" | "TEACHER";

interface Portal {
  key: PortalKey;
  label: string;
  icon: React.ElementType;
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  demo: string;
  /** glow tint used behind the glass card */
  glow: string;
  pillActive: string;
  submit: string;
  ring: string;
}

const PORTALS: Portal[] = [
  {
    key: "STUDENT",
    label: "Student",
    icon: GraduationCap,
    image: "/images/login-students.jpg",
    imageAlt: "Students of Sankar Matriculation School in their classroom",
    title: "Student Login",
    description: "View your attendance record",
    usernameLabel: "Admission No.",
    usernamePlaceholder: "e.g. SMS0001",
    demo: "SMS0001 · student123",
    glow: "rgba(56, 189, 248, 0.35)", // sky — logo blue
    pillActive: "bg-sky-500 hover:bg-sky-400 text-white border-sky-400",
    submit: "bg-sky-500 hover:bg-sky-400 focus-visible:ring-sky-300",
    ring: "focus-visible:ring-sky-300 focus-visible:border-sky-300",
  },
  {
    key: "ADMIN",
    label: "Admin",
    icon: ShieldCheck,
    image: "/images/login-admin.jpg",
    imageAlt: "School administration office",
    title: "Admin Login",
    description: "Manage students, staff and school settings",
    usernameLabel: "Username",
    usernamePlaceholder: "e.g. admin",
    demo: "admin · admin123",
    glow: "rgba(240, 112, 32, 0.4)", // orange — logo primary
    pillActive: "bg-primary hover:bg-primary/90 text-primary-foreground border-primary",
    submit: "bg-primary hover:bg-primary/90 focus-visible:ring-orange-300",
    ring: "focus-visible:ring-orange-300 focus-visible:border-orange-300",
  },
  {
    key: "TEACHER",
    label: "Teacher",
    icon: BookOpenCheck,
    image: "/images/login-teacher.jpg",
    imageAlt: "Teacher helping students with a laptop",
    title: "Teacher Login",
    description: "Mark daily attendance and view class reports",
    usernameLabel: "Username",
    usernamePlaceholder: "e.g. teacher1",
    demo: "teacher1 · teacher123",
    glow: "rgba(132, 204, 22, 0.38)", // lime — logo green
    pillActive: "bg-lime-600 hover:bg-lime-500 text-white border-lime-500",
    submit: "bg-lime-600 hover:bg-lime-500 focus-visible:ring-lime-300",
    ring: "focus-visible:ring-lime-300 focus-visible:border-lime-300",
  },
];

export function LoginView({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [portalIdx, setPortalIdx] = useState<0 | 1 | 2>(1); // default: Admin
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const portal = PORTALS[portalIdx];
  const PortalIcon = portal.icon;

  function selectPortal(i: number) {
    if (i === portalIdx) return;
    setPortalIdx(i as 0 | 1 | 2);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api<{ user: SessionUser }>("/api/auth/login", {
        method: "POST",
        json: { username, password },
      });
      onLogin(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-neutral-950">
      {/* ---- sliding background ---- */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="flex h-full w-full transition-transform duration-700 ease-in-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${portalIdx * 100}%)` }}
        >
          {PORTALS.map((p) => (
            <div key={p.key} className="relative h-full w-full shrink-0">
              <Image
                src={p.image}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
              {/* semi-transparent veil so text stays readable */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80" />
            </div>
          ))}
        </div>
      </div>

      {/* role-tinted ambient glow (transitions with the selected pill) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72 transition-colors duration-700"
        style={{ background: `linear-gradient(to top, ${portal.glow}, transparent)` }}
      />

      {/* ---- foreground ---- */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-5 sm:py-7">
        {/* brand */}
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo-mark.png"
            alt="Sankar Matriculation School logo"
            width={64}
            height={64}
            priority
            className="h-14 w-14 object-contain drop-shadow-lg sm:h-16 sm:w-16"
          />
          <h1 className="mt-2.5 text-lg font-bold tracking-wide text-white drop-shadow sm:text-xl">
            SANKAR MATRICULATION SCHOOL
          </h1>
          <p className="mt-0.5 text-xs text-white/75 sm:text-sm">
            Sankagiri West, Namakkal District · Online Attendance Management
          </p>
        </div>

        {/* portal pills */}
        <div
          role="tablist"
          aria-label="Choose login type"
          className="mt-5 flex w-full max-w-md items-center justify-center gap-2 sm:gap-3"
        >
          {PORTALS.map((p, i) => {
            const Icon = p.icon;
            const active = i === portalIdx;
            return (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectPortal(i)}
                className={cn(
                  "inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border px-2 text-[13px] font-medium backdrop-blur-md transition-all duration-300 sm:flex-none sm:gap-2 sm:px-6 sm:text-sm",
                  active
                    ? `${p.pillActive} shadow-lg`
                    : "border-white/30 bg-white/10 text-white/85 hover:bg-white/20 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* glass card */}
        <div className="mt-5 w-full max-w-sm">
          <div
            role="tabpanel"
            aria-label={portal.title}
            className="rounded-2xl border border-white/25 bg-white/10 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  portal.pillActive
                )}
              >
                <PortalIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white">{portal.title}</h2>
                <p className="truncate text-xs text-white/70">{portal.description}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-white/85">
                  {portal.usernameLabel}
                </Label>
                <Input
                  id="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  placeholder={portal.usernamePlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={busy}
                  required
                  className={cn(
                    "border-white/30 bg-white/10 text-white placeholder:text-white/45 focus-visible:ring-2",
                    portal.ring
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/85">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    required
                    className={cn(
                      "border-white/30 bg-white/10 pr-10 text-white placeholder:text-white/45 focus-visible:ring-2",
                      portal.ring
                    )}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/60 hover:text-white"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-md border border-red-300/30 bg-red-500/20 px-3 py-2 text-sm text-red-100"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className={cn(
                  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:opacity-60",
                  portal.submit
                )}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Signing
                    in…
                  </>
                ) : (
                  `Sign in as ${portal.label}`
                )}
              </button>
            </form>

            <div className="mt-4 flex gap-2 rounded-xl border border-white/20 bg-black/20 px-3 py-2.5 text-xs text-white/75">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="mb-0.5 font-medium text-white/85">Demo credentials</p>
                <p className="tabular-nums">{portal.demo}</p>
              </div>
            </div>
          </div>
        </div>

        {/* footer pinned to bottom */}
        <footer className="mt-auto pt-5 pb-3 text-center text-[11px] text-white/60">
          <p>Sankar Matriculation School — Sankagiri West, Namakkal District, Tamil Nadu</p>
          <p className="mt-0.5">Attendance Management System · v1.1</p>
        </footer>
      </div>
    </div>
  );
}
