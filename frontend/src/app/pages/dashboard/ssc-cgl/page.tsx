"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../../../../lib/apiConfig";

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

function DocumentIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function SscCglDashboardContent() {
  const router = useRouter();
  const [expandedYear, setExpandedYear] = useState<number | null>(2024);
  const [dbShifts, setDbShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const years = [2024, 2023, 2022];

  useEffect(() => {
    const fetchDbShifts = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/exams`);
        if (!response.ok) throw new Error("Failed to fetch exams");
        const data = await response.json();

        const sscExam = data.find((e: any) => e.name === "SSC CGL");
        if (sscExam && sscExam.shifts) {
          setDbShifts(sscExam.shifts);
        }
      } catch (error) {
        console.error("Error fetching SSC CGL exams from backend:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDbShifts();
  }, []);

  const handleStartExam = (name: string, year: number, shiftId?: string) => {
    if (shiftId) {
      router.push(
        `/pages/dashboard/ssc-cgl/workspace?shiftId=${shiftId}&name=${encodeURIComponent(name)}&year=${year}`
      );
    } else {
      alert(`Launching Mock Exam...\nSSC CGL Year: ${year}\nTarget: ${name}\n\n(Select a live database shift to start full evaluation)`);
    }
  };

  const getShiftsForYear = (year: number) => {
    const matchingDbShifts = dbShifts.filter((shift: any) => {
      const shiftDate = new Date(shift.date);
      return shiftDate.getUTCFullYear() === year || shift.name.includes(year.toString());
    });

    const combined: { name: string; id?: string; isDb?: boolean }[] = [];

    matchingDbShifts.forEach((shift: any) => {
      combined.push({
        name: shift.name,
        id: shift.id,
        isDb: true
      });
    });

    if (year === 2024 && !combined.some(c => c.name.includes("9 Sep"))) {
      combined.push({
        name: "9 Sep 2024 - Shift 1 (100 Questions)",
        isDb: false
      });
    }

    return combined;
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] w-full max-w-[1500px] items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-5">
            <button
              onClick={() => router.push("/pages/dashboard")}
              className="group flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-600"
            >
              <span className="text-xl transition group-hover:-translate-x-1">←</span>
              <span>Dashboard</span>
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                SSC CGL <span className="ml-2 text-emerald-600">WORKSPACE</span>
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 sm:flex">
            <span className="text-base">⚡</span>
            <div className="leading-tight">
              <p className="text-xs font-bold text-slate-800">Tier 1 Live Papers</p>
              <p className="text-[10px] text-slate-500">Speed and accuracy matter.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1500px] px-5 py-7 lg:px-10 lg:py-9">
        {/* Hero Section */}
        <section className="relative mb-7 overflow-hidden rounded-[24px] border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-6 py-7 shadow-sm sm:px-9">
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-md ring-1 ring-emerald-100">
                <DocumentIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
                  Staff Selection Commission
                </p>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  SSC CGL Tier-I Question Papers
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Attempt official SSC CGL question papers with 100 questions (200 marks, +2 per correct, -0.5 per wrong, 60 minutes duration).
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <div className="flex h-20 w-20 rotate-[-5deg] items-center justify-center rounded-2xl bg-emerald-100 text-4xl shadow-sm">
                🎯
              </div>
              <div className="flex h-16 w-16 rotate-[6deg] items-center justify-center rounded-2xl bg-teal-100 text-3xl shadow-sm">
                🏆
              </div>
            </div>
          </div>
        </section>

        {/* Year Papers List */}
        <div className="space-y-5">
          {years.map((year) => {
            const isExpanded = expandedYear === year;
            const shifts = getShiftsForYear(year);

            return (
              <section
                key={year}
                className={`overflow-hidden rounded-[22px] border bg-white transition-all duration-300 ${
                  isExpanded
                    ? "border-emerald-200 shadow-lg shadow-emerald-100/40"
                    : "border-slate-200 shadow-sm hover:border-emerald-100 hover:shadow-md"
                }`}
              >
                <button
                  onClick={() => setExpandedYear(isExpanded ? null : year)}
                  className="flex w-full items-center justify-between px-5 py-5 text-left transition hover:bg-slate-50/70 sm:px-7"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                        isExpanded ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <CalendarIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 sm:text-xl">
                        SSC CGL {year} Papers
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
                        <span>{shifts.length} Live Papers</span>
                        <span className="text-slate-300">•</span>
                        <span>Tier-I Exam</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`hidden rounded-xl px-4 py-2 text-xs font-bold sm:block ${
                        isExpanded ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {isExpanded ? "Hide Sheets" : `View ${shifts.length} Papers`}
                    </span>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                        isExpanded ? "rotate-180 bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      ↓
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-4 sm:p-6">
                    {shifts.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {shifts.map((shift, idx) => (
                          <div
                            key={shift.id || idx}
                            onClick={() => handleStartExam(shift.name, year, shift.id)}
                            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                  <DocumentIcon className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-slate-800">{shift.name}</p>
                                    {shift.isDb && (
                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 uppercase">
                                        Live DB
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-xs text-slate-400">
                                    100 Questions • 60 Mins • 200 Marks (+2, -0.5)
                                  </p>
                                </div>
                              </div>

                              <span className="flex shrink-0 items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
                                Start Exam
                                <ArrowIcon />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-sm text-slate-500 py-4">No papers available for this year yet.</p>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default function SscCglDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading SSC CGL Papers...</div>}>
      <SscCglDashboardContent />
    </Suspense>
  );
}