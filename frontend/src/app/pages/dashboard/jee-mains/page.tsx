"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiBaseUrl } from "../../../../lib/apiConfig";

// Real NTA schedule days for January
const janExamDays = [22, 23, 24, 28, 29];

const mainsPapersData: Record<
  number,
  { january: string[]; april: string[] }
> = {
  2026: {
    january: Array.from({ length: 10 }, (_, i) => {
      const day = janExamDays[Math.floor(i / 2)];
      const shift = i % 2 === 0 ? 1 : 2;
      return `${day} Jan - Shift ${shift}`;
    }),
    april: Array.from(
      { length: 8 },
      (_, i) => `25 Apr - Shift ${i % 2 === 0 ? 1 : 2}`
    ),
  },
};

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

function DocumentIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function JeeExamPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawExamType = searchParams.get("type");
  const examType = rawExamType || "mains";

  const isAdvanced = examType === "advanced";
  const displayName = isAdvanced ? "JEE Advanced" : "JEE Mains";

  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [dbShifts, setDbShifts] = useState<any[]>([]);

  const years = Array.from({ length: 10 }, (_, index) => 2026 - index);

  // ---------------------------------------------------------
  // Fetch database shifts
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchDbShifts = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/exams`);

        if (!response.ok) {
          throw new Error("Failed to fetch exams");
        }

        const data = await response.json();

        const jeeMain = data.find(
          (e: any) => e.name === "JEE Main"
        );

        if (jeeMain && jeeMain.shifts) {
          setDbShifts(jeeMain.shifts);
        }
      } catch (error) {
        console.error(
          "Error fetching exams from backend:",
          error
        );
      }
    };

    fetchDbShifts();
  }, []);

  // ---------------------------------------------------------
  // Start exam
  // ---------------------------------------------------------
  const handleStartExam = (
    name: string,
    year: number,
    shiftId?: string
  ) => {
    if (shiftId) {
      router.push(
        `/pages/dashboard/jee-mains/workspace?shiftId=${shiftId}&name=${encodeURIComponent(
          name
        )}&year=${year}`
      );
    } else {
      alert(
        `Launching Exam Workspace...\nSeries: ${displayName}\nYear: ${year}\nTarget: ${name}\n\n(This is a static mock card.)`
      );
    }
  };

  // ---------------------------------------------------------
  // Merge DB shifts + static shifts
  // ---------------------------------------------------------
  const getShiftsForAttempt = (
    year: number,
    attempt: "january" | "april"
  ) => {
    const staticNames = mainsPapersData[year]?.[attempt] || [];

    const matchingDbShifts = dbShifts.filter((shift: any) => {
      const shiftDate = new Date(shift.date);

      const shiftYear = shiftDate.getUTCFullYear();
      const shiftMonth = shiftDate.getUTCMonth();

      const matchesYear = shiftYear === year;

      const matchesAttempt =
        (attempt === "january" && shiftMonth === 0) ||
        (attempt === "april" && shiftMonth === 3);

      return matchesYear && matchesAttempt;
    });

    const combined: {
      name: string;
      id?: string;
    }[] = [];

    // Database shifts first
    matchingDbShifts.forEach((shift: any) => {
      combined.push({
        name: shift.name,
        id: shift.id,
      });
    });

    // Static shifts
    staticNames.forEach((name: string) => {
      if (!combined.some((c) => c.name === name)) {
        combined.push({ name });
      }
    });

    // Sort by day
    combined.sort((a, b) => {
      const getDayNum = (name: string) => {
        const match = name.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 999;
      };

      return getDayNum(a.name) - getDayNum(b.name);
    });

    return combined;
  };

  return (
    <div className="min-h-screen w-full bg-[#f7f9ff] text-slate-900">

      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-[1500px] items-center justify-between px-6 lg:px-10">

          <div className="flex items-center gap-5">

            <button
              onClick={() =>
                router.push("/pages/dashboard")
              }
              className="group flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
            >
              <span className="text-xl transition group-hover:-translate-x-1">
                ←
              </span>

              <span>Dashboard</span>
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                JEE MAINS
                <span className="ml-2 text-indigo-600">
                  WORKSPACE
                </span>
              </h1>
            </div>

          </div>

          {/* Header status */}
          <div className="hidden items-center gap-3 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 sm:flex">
            <span className="text-base">🔥</span>

            <div className="leading-tight">
              <p className="text-xs font-bold text-slate-800">
                Keep going!
              </p>

              <p className="text-[10px] text-slate-500">
                Your consistency is your superpower.
              </p>
            </div>
          </div>

        </div>
      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}
      <main className="mx-auto w-full max-w-[1500px] px-5 py-7 lg:px-10 lg:py-9">

        {/* ===================================================
            HERO
        =================================================== */}
        <section className="relative mb-7 overflow-hidden rounded-[24px] border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 px-6 py-7 shadow-sm sm:px-9">

          {/* Decorative blobs */}
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-200/30 blur-3xl" />
          <div className="absolute -bottom-20 right-48 h-40 w-40 rounded-full bg-purple-200/30 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">

            <div className="flex items-start gap-5">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100">
                <DocumentIcon className="h-7 w-7" />
              </div>

              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">
                  Exam Preparation
                </p>

                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Welcome to Your JEE Journey!
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Select a year to explore shifted papers,
                  attempt real database exams, and practice
                  with mock papers.
                </p>
              </div>

            </div>

            {/* Small illustration */}
            <div className="hidden items-center gap-3 md:flex">

              <div className="flex h-20 w-20 rotate-[-5deg] items-center justify-center rounded-2xl bg-indigo-100 text-4xl shadow-sm">
                📚
              </div>

              <div className="flex h-16 w-16 rotate-[6deg] items-center justify-center rounded-2xl bg-purple-100 text-3xl shadow-sm">
                🎓
              </div>

            </div>

          </div>
        </section>


        {/* ===================================================
            YEAR LIST
        =================================================== */}
        <div className="space-y-5">

          {years.map((year) => {

            const isExpanded = expandedYear === year;

            const janShifts = getShiftsForAttempt(
              year,
              "january"
            );

            const aprShifts = getShiftsForAttempt(
              year,
              "april"
            );

            const totalPapersCount = isAdvanced
              ? 2
              : janShifts.length + aprShifts.length;

            const totalAttempts =
              (janShifts.length > 0 ? 1 : 0) +
              (aprShifts.length > 0 ? 1 : 0);

            return (
              <section
                key={year}
                className={`overflow-hidden rounded-[22px] border bg-white transition-all duration-300 ${
                  isExpanded
                    ? "border-indigo-200 shadow-lg shadow-indigo-100/40"
                    : "border-slate-200 shadow-sm hover:border-indigo-100 hover:shadow-md"
                }`}
              >

                {/* =================================================
                    YEAR HEADER
                ================================================= */}
                <button
                  onClick={() =>
                    setExpandedYear(
                      isExpanded ? null : year
                    )
                  }
                  className="flex w-full items-center justify-between px-5 py-5 text-left transition hover:bg-slate-50/70 sm:px-7"
                >

                  <div className="flex items-center gap-4">

                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                        isExpanded
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <CalendarIcon className="h-6 w-6" />
                    </div>

                    <div>

                      <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                        {year} Papers
                      </h3>

                      <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">

                        <span>
                          {totalPapersCount} Papers
                        </span>

                        <span className="text-slate-300">
                          •
                        </span>

                        <span>
                          {totalAttempts} Attempts
                        </span>

                      </div>

                    </div>

                  </div>


                  <div className="flex items-center gap-3">

                    <span
                      className={`hidden rounded-xl px-4 py-2 text-xs font-bold sm:block ${
                        isExpanded
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      {isExpanded
                        ? "Hide Sheets"
                        : `View ${totalPapersCount} Papers`}
                    </span>

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                        isExpanded
                          ? "rotate-180 bg-emerald-50 text-emerald-600"
                          : "bg-indigo-50 text-indigo-600"
                      }`}
                    >
                      ↓
                    </div>

                  </div>

                </button>


                {/* =================================================
                    EXPANDED CONTENT
                ================================================= */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-6">

                    {isAdvanced ? (

                      /* ==========================================
                         JEE ADVANCED
                      ========================================== */
                      <div className="grid gap-4 md:grid-cols-2">

                        {[
                          {
                            title: "JEE Advanced - Paper 1",
                            subtitle:
                              "Physics, Chemistry, Mathematics",
                            paper: "Paper 1 (PCM)",
                          },
                          {
                            title: "JEE Advanced - Paper 2",
                            subtitle:
                              "Physics, Chemistry, Mathematics",
                            paper: "Paper 2 (PCM)",
                          },
                        ].map((paper) => (

                          <div
                            key={paper.paper}
                            onClick={() =>
                              handleStartExam(
                                paper.paper,
                                year
                              )
                            }
                            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg"
                          >

                            <div className="flex items-center justify-between gap-4">

                              <div className="flex items-center gap-4">

                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                  <DocumentIcon className="h-5 w-5" />
                                </div>

                                <div>
                                  <p className="font-bold text-slate-800">
                                    {paper.title}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    {paper.subtitle}
                                  </p>
                                </div>

                              </div>

                              <span className="flex shrink-0 items-center gap-1 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                                Start
                                <ArrowIcon />
                              </span>

                            </div>

                          </div>

                        ))}

                      </div>

                    ) : (

                      /* ==========================================
                         JEE MAINS
                      ========================================== */
                      <div className="grid gap-5 lg:grid-cols-2">

                        {/* =================================================
                            JANUARY
                        ================================================= */}
                        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">

                          {/* January heading */}
                          <div className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-5 py-5">

                            <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-blue-100/50 to-transparent" />

                            <div className="relative flex items-center gap-3">

                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200">
                                <CalendarIcon className="h-5 w-5" />
                              </div>

                              <div>
                                <h3 className="font-black uppercase tracking-wide text-blue-700">
                                  January Attempt
                                </h3>

                                <p className="mt-1 text-xs font-medium text-slate-500">
                                  {janShifts.length} Papers
                                </p>
                              </div>

                            </div>

                          </div>


                          {/* January papers */}
                          <div className="space-y-2.5 p-3">

                            {janShifts.length === 0 ? (

                              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                                No January papers available
                              </div>

                            ) : (

                              janShifts.map((shift, idx) => (

                                <div
                                  key={`${shift.name}-${idx}`}
                                  onClick={() =>
                                    handleStartExam(
                                      shift.name,
                                      year,
                                      shift.id
                                    )
                                  }
                                  className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-all duration-200 hover:-translate-y-[1px] hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-sm"
                                >

                                  <div className="flex min-w-0 items-center gap-3">

                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 transition group-hover:bg-blue-600 group-hover:text-white">
                                      <DocumentIcon className="h-4 w-4" />
                                    </div>

                                    <span className="truncate text-sm font-semibold text-slate-700">
                                      {shift.name}
                                    </span>

                                  </div>


                                  <span
                                    className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-bold transition ${
                                      shift.id
                                        ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                                        : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                                    }`}
                                  >
                                    {shift.id
                                      ? "Start DB Exam"
                                      : "Start Mock"}

                                    <ArrowIcon />
                                  </span>

                                </div>

                              ))

                            )}

                          </div>

                        </div>


                        {/* =================================================
                            APRIL
                        ================================================= */}
                        <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">

                          {/* April heading */}
                          <div className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-5 py-5">

                            <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-orange-100/50 to-transparent" />

                            <div className="relative flex items-center gap-3">

                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-200">
                                <CalendarIcon className="h-5 w-5" />
                              </div>

                              <div>
                                <h3 className="font-black uppercase tracking-wide text-orange-600">
                                  April Attempt
                                </h3>

                                <p className="mt-1 text-xs font-medium text-slate-500">
                                  {aprShifts.length} Papers
                                </p>
                              </div>

                            </div>

                          </div>


                          {/* April papers */}
                          <div className="space-y-2.5 p-3">

                            {aprShifts.length === 0 ? (

                              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                                No April papers available
                              </div>

                            ) : (

                              aprShifts.map((shift, idx) => (

                                <div
                                  key={`${shift.name}-${idx}`}
                                  onClick={() =>
                                    handleStartExam(
                                      shift.name,
                                      year,
                                      shift.id
                                    )
                                  }
                                  className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-all duration-200 hover:-translate-y-[1px] hover:border-orange-300 hover:bg-orange-50/30 hover:shadow-sm"
                                >

                                  <div className="flex min-w-0 items-center gap-3">

                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500 transition group-hover:bg-orange-500 group-hover:text-white">
                                      <DocumentIcon className="h-4 w-4" />
                                    </div>

                                    <span className="truncate text-sm font-semibold text-slate-700">
                                      {shift.name}
                                    </span>

                                  </div>


                                  <span
                                    className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-bold transition ${
                                      shift.id
                                        ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                                        : "bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white"
                                    }`}
                                  >
                                    {shift.id
                                      ? "Start DB Exam"
                                      : "Start Mock"}

                                    <ArrowIcon />
                                  </span>

                                </div>

                              ))

                            )}

                          </div>

                        </div>

                      </div>
                    )}

                  </div>
                )}

              </section>
            );
          })}

        </div>


        {/* ===================================================
            FOOTER MOTIVATION
        =================================================== */}
        <section className="relative mt-7 overflow-hidden rounded-[22px] border border-indigo-100 bg-gradient-to-r from-blue-50 via-white to-purple-50 px-6 py-6">

          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-200/30 blur-2xl" />

          <div className="relative flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-5">

            <div className="text-3xl">
              🚀
            </div>

            <div>
              <p className="font-bold text-slate-800">
                Small steps every day lead to big results.
              </p>

              <p className="mt-1 text-xs font-medium text-slate-500">
                Practice consistently. Improve every attempt.
                💜 All the best!
              </p>
            </div>

          </div>

        </section>

      </main>
    </div>
  );
}


// =============================================================
// PAGE EXPORT
// =============================================================

export default function JeeExamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f9ff]">
          <div className="text-center">

            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />

            <p className="text-sm font-semibold text-slate-500">
              Loading JEE Workspace...
            </p>

          </div>
        </div>
      }
    >
      <JeeExamPageContent />
    </Suspense>
  );
}