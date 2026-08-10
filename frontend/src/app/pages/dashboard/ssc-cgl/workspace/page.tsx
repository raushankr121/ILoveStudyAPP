"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getApiBaseUrl } from '../../../../../lib/apiConfig';
import { useTest } from '../../../../context/TestContext';
import { LatexRenderer } from '../../../../components/LatexRenderer';

function SscTestWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shiftId = searchParams.get('shiftId') || "";
  const name = searchParams.get('name') || "SSC CGL Tier-I 2024";
  const year = parseInt(searchParams.get('year') || "2024", 10);

  const {
    questions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    answers,
    selectOption,
    examTimeLeft,
    questionTimers,
    setQuestionTimers,
    isFullscreen,
    setIsFullscreen,
    submitFinalExam,
    loading,
    loadShift,
    isExamActive,
    setIsExamActive
  } = useTest();

  const [selectedSubject, setSelectedSubject] = useState<string>("General Intelligence and Reasoning");
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set());
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // Per-Section Timer State (25 Mins = 1500 Seconds per section, 60 Mins Total)
  const [sectionTimeLeft, setSectionTimeLeft] = useState<Record<string, number>>({
    "General Intelligence and Reasoning": 1500,
    "General Awareness": 1500,
    "Quantitative Aptitude": 1500,
    "English Comprehension": 1500
  });

  // Proctoring states
  const [violationsCount, setViolationsCount] = useState<number>(0);
  const [showViolationModal, setShowViolationModal] = useState<boolean>(false);
  const [violationReason, setViolationReason] = useState<string>("");
  const [showAutoSubmitModal, setShowAutoSubmitModal] = useState<boolean>(false);

  // Pre-check states
  const [showPreCheck, setShowPreCheck] = useState<boolean>(true);
  const [internetStatus, setInternetStatus] = useState<'checking' | 'connected' | 'limited' | 'disconnected'>('checking');
  const [extensionStatus, setExtensionStatus] = useState<'checking' | 'clean' | 'warning'>('checking');
  const [detectedExts, setDetectedExts] = useState<string[]>([]);

  // Unique list of subjects in questions
  const availableSubjects = Array.from(new Set(questions.map(q => q.subject)));
  const currentSubjectList = availableSubjects.length > 0 ? availableSubjects : [
    "General Intelligence and Reasoning",
    "General Awareness",
    "Quantitative Aptitude",
    "English Comprehension"
  ];

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const resData = await submitFinalExam();
      setSubmitResult(resData);
      setSubmitSuccess(true);
      setShowAutoSubmitModal(false);
      setShowSubmitModal(true);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(err => console.error("Error exiting fullscreen:", err));
      }
    } catch (err) {
      console.error("Failed to submit SSC exam:", err);
      alert("Failed to submit exam. Please try again.");
      setShowAutoSubmitModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runPreChecks = async () => {
    setInternetStatus('checking');
    setExtensionStatus('checking');

    const online = navigator.onLine;
    let pingOk = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${getApiBaseUrl()}/api/exams`, { 
        method: 'HEAD',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      if (res.ok) pingOk = true;
    } catch (e) {
      console.warn("Ping failed, relying on navigator.onLine:", e);
    }
    setInternetStatus(online && pingOk ? 'connected' : (online ? 'limited' : 'disconnected'));

    const detectedExtensions: string[] = [];
    if (typeof document !== 'undefined') {
      const scripts = Array.from(document.querySelectorAll('script'));
      const hasExtensionUrl = (src: string) => src && (src.includes('chrome-extension://') || src.includes('moz-extension://'));
      scripts.forEach(s => {
        if (hasExtensionUrl(s.src)) detectedExtensions.push("Script Injector");
      });
      if (document.querySelector('grammarly-extension') || document.querySelector('[data-gr-ext-installed]')) {
        detectedExtensions.push("Grammarly");
      }
      if (document.documentElement.querySelector('style[class*="darkreader"]')) {
        detectedExtensions.push("DarkReader");
      }
    }

    setDetectedExts(detectedExtensions);
    setExtensionStatus(detectedExtensions.length > 0 ? 'warning' : 'clean');
  };

  useEffect(() => {
    if (questions.length > 0 && !isExamActive) {
      runPreChecks();
    }
  }, [questions]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (isExamActive && !isCurrentlyFullscreen && !showSubmitModal && !submitSuccess && violationsCount < 5) {
        setViolationsCount(prev => prev + 1);
        setViolationReason("Exited fullscreen mode");
        setShowViolationModal(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isExamActive, showSubmitModal, submitSuccess, violationsCount, setIsFullscreen]);

  // PrintScreen & Screenshot & Focus Loss Security Proctoring
  useEffect(() => {
    if (!isExamActive || violationsCount >= 5 || showSubmitModal || submitSuccess) return;

    const triggerViolation = (reason: string) => {
      setViolationsCount((prev) => prev + 1);
      setViolationReason(reason);
      setShowViolationModal(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCopy = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c';
      const isPaste = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v';
      const isCut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x';
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen';
      const isWinScreenshot = (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's';
      const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5');

      if (isCopy || isPaste || isCut || isPrintScreen || isWinScreenshot || isMacScreenshot) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation(
          isPrintScreen ? "PrintScreen key pressed (Screenshot prohibited)" :
          isWinScreenshot || isMacScreenshot ? "OS-level Screenshot shortcut detected (Win+Shift+S / Cmd+Shift+3,4,5)" :
          isCopy ? "Copy shortcut (Ctrl+C / Cmd+C) prohibited" :
          isPaste ? "Paste shortcut (Ctrl+V / Cmd+V) prohibited" :
          "Cut shortcut (Ctrl+X / Cmd+X) prohibited"
        );
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen') {
        e.preventDefault();
        triggerViolation("PrintScreen key action detected (Screenshot prohibited)");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation("Right-click context menu prohibited");
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', 'Security Violation: Copying exam content is strictly prohibited.');
      }
      triggerViolation("Clipboard copy prohibited");
    };

    const handleBlur = () => {
      if (showSubmitModal || submitSuccess || !isExamActive) return;
      triggerViolation("Window lost focus (Screenshot / Snipping Tool active)");
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('copy', handleCopy, true);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isExamActive, violationsCount, showSubmitModal, submitSuccess]);

  useEffect(() => {
    if (shiftId) {
      loadShift(shiftId, name, year);
    }
  }, [shiftId]);

  useEffect(() => {
    if (currentSubjectList.length > 0 && !currentSubjectList.includes(selectedSubject)) {
      setSelectedSubject(currentSubjectList[0]);
    }
  }, [questions]);

  // Master Question Timer & Section Timer Interval
  useEffect(() => {
    if (!isExamActive || questions.length === 0 || showSubmitModal || submitSuccess) return;
    const activeQuestion = questions[currentQuestionIndex];
    if (!activeQuestion) return;

    setVisitedQuestions((prev) => new Set(prev).add(activeQuestion.id));

    const timer = setInterval(() => {
      setQuestionTimers((prev) => ({
        ...prev,
        [activeQuestion.id]: (prev[activeQuestion.id] || 0) + 1
      }));

      setSectionTimeLeft((prev) => {
        const currentSecRem = prev[selectedSubject] ?? 1500;
        return {
          ...prev,
          [selectedSubject]: Math.max(0, currentSecRem - 1)
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, isExamActive, questions, selectedSubject, showSubmitModal, submitSuccess]);

  // Master Overall Exam Timer End
  useEffect(() => {
    if (isExamActive && examTimeLeft <= 0 && !showSubmitModal && !submitSuccess) {
      alert("Time is up! Your exam will be submitted automatically.");
      handleFinalSubmit();
    }
  }, [examTimeLeft, isExamActive]);

  // Violations Max Limit (5) Auto-Submit
  useEffect(() => {
    if (violationsCount >= 5 && isExamActive && !showAutoSubmitModal && !submitSuccess) {
      setShowViolationModal(false);
      setShowAutoSubmitModal(true);
      setTimeout(() => {
        handleFinalSubmit();
      }, 3000);
    }
  }, [violationsCount, isExamActive]);

  const handleStartExamFromCheck = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn("Fullscreen request denied or restricted:", err);
    }
    setShowPreCheck(false);
    setIsExamActive(true);
  };

  const handleResumeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn("Could not re-enter fullscreen:", err);
    }
    setShowViolationModal(false);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error enabling full-screen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs.toString().padStart(2, '0')}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
        <p className="font-bold text-lg">Loading SSC CGL Shift Questions...</p>
      </div>
    );
  }

  const subjectQuestions = questions.filter(q => q.subject === selectedSubject);
  const currentQuestion = questions[currentQuestionIndex];

  const answeredQuestionsCount = Object.keys(answers).length;
  const remainingQuestionsCount = questions.length - answeredQuestionsCount;
  const unattemptedQuestionsCount = questions.length - visitedQuestions.size;

  const subjectCounters = {
    answered: subjectQuestions.filter(q => !!answers[q.id]).length,
    notAnswered: subjectQuestions.filter(q => visitedQuestions.has(q.id) && !answers[q.id]).length,
    notVisited: subjectQuestions.filter(q => !visitedQuestions.has(q.id)).length
  };

  const activeSectionRemSeconds = sectionTimeLeft[selectedSubject] ?? 1500;

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const nextQ = questions[currentQuestionIndex + 1];
      if (nextQ && nextQ.subject !== selectedSubject) {
        setSelectedSubject(nextQ.subject);
      }
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const prevQ = questions[currentQuestionIndex - 1];
      if (prevQ && prevQ.subject !== selectedSubject) {
        setSelectedSubject(prevQ.subject);
      }
    }
  };

  const handleOptionClick = (optionKey: string) => {
    if (!currentQuestion) return;
    selectOption(currentQuestion.id, optionKey);
  };

  const handleGridQuestionClick = (questionId: string) => {
    const idx = questions.findIndex(q => q.id === questionId);
    if (idx !== -1) {
      setCurrentQuestionIndex(idx);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col select-none overflow-hidden h-screen">
      {/* System Hardware & Security Check Dialog */}
      {showPreCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955 bg-opacity-90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 font-bold">
                  SSC
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">SSC CGL Environment Pre-Check</h3>
                  <p className="text-xs text-slate-400">Verifying secure browser state and connectivity</p>
                </div>
              </div>
              <button
                onClick={runPreChecks}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                <span>Re-check</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Internet Check */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${internetStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a10 10 0 0114.142 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Network Connectivity</p>
                    <p className="text-xs text-slate-400">Low-latency Redis synchronization active</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${internetStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {internetStatus === 'connected' ? 'CONNECTED' : 'CHECKING...'}
                </span>
              </div>

              {/* Extension Check */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Browser Security &amp; Fullscreen</p>
                    <p className="text-xs text-slate-400">PrintScreen and Snipping Tool monitoring active</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                  PASSED
                </span>
              </div>
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">SSC CGL Tier-I Instructions</h4>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                <li>Total Questions: 100 | Overall Duration: <strong>60 Minutes</strong></li>
                <li>Per-Section Time Target: <strong>25 Minutes</strong> per section</li>
                <li>Marking Scheme: <strong>+2.0 Marks</strong> for Correct, <strong>-0.5 Marks</strong> for Wrong</li>
                <li>Full Screen mode &amp; Screenshot protection enforced.</li>
              </ul>
            </div>

            <button
              onClick={handleStartExamFromCheck}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition duration-150 transform active:translate-y-0.5"
            >
              Start Official SSC CGL Exam (Fullscreen) &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => {
              if (confirm("Are you sure you want to exit the exam? Your progress is saved.")) {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(err => console.error(err));
                }
                router.push('/pages/dashboard/ssc-cgl');
              }
            }} 
            className="text-slate-400 hover:text-white transition text-xs font-semibold uppercase tracking-wider flex items-center space-x-1"
          >
            <span>&larr; Exit Exam</span>
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/20">
            SSC CGL Tier-I
          </span>
          <h1 className="text-sm font-bold text-slate-200 hidden md:block">{name}</h1>
        </div>

        {/* Live Timers Display (Overall 60m + Active Section 25m) */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Active Section Timer */}
          <div className="hidden sm:flex items-center space-x-2 bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-800 shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Section:</span>
            <span className={`font-mono text-sm font-extrabold tracking-wider ${activeSectionRemSeconds < 300 ? 'text-amber-400 animate-pulse' : 'text-teal-400'}`}>
              {formatTime(activeSectionRemSeconds)}
            </span>
          </div>

          {/* Overall Exam Timer */}
          <div className="flex items-center space-x-2 bg-slate-950 px-4 py-1.5 rounded-lg border border-slate-800 shadow-inner">
            <svg className="h-4 w-4 text-emerald-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono text-base font-extrabold text-emerald-400 tracking-wider">
              {formatTime(examTimeLeft)}
            </span>
          </div>

          {!isFullscreen && (
            <button 
              onClick={handleToggleFullscreen}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg transition flex items-center justify-center"
              title="Enter Fullscreen Mode"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 20v-4m0 4h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}

          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-md transition duration-150"
          >
            Submit Test
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Area: Questions & Options */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
          {/* Subject Navigation Tabs with per-section timer badge */}
          <div className="flex items-center space-x-2 border-b border-slate-800 bg-slate-900/50 px-6 py-2 shrink-0 overflow-x-auto">
            {currentSubjectList.map((subject) => {
              const count = questions.filter(q => q.subject === subject).length;
              const secRem = sectionTimeLeft[subject] ?? 1500;
              const isSelected = selectedSubject === subject;

              return (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition duration-150 flex items-center space-x-2 shrink-0 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{subject} ({count})</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {formatTime(secRem)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Question Box */}
          {currentQuestion ? (
            <div className="flex-1 p-6 max-w-4xl w-full mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Marks: <span className="text-emerald-400 font-bold">+2.0</span> / <span className="text-rose-400 font-bold">-0.5</span>
                </span>
              </div>

              {/* Question Text */}
              <div className="text-base text-slate-100 font-medium leading-relaxed bg-slate-900/40 p-5 rounded-xl border border-slate-850">
                <LatexRenderer text={currentQuestion.questionText} />
              </div>

              {currentQuestion.imageUrl && (
                <div className="mt-3 border border-slate-800 rounded-xl p-4 bg-slate-900/80 flex justify-center shadow-inner">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Question Figure / Diagram" 
                    className="max-h-80 object-contain rounded-lg" 
                  />
                </div>
              )}

              {/* Options List (Supports rendered latex or option images) */}
              <div className="space-y-3 pt-2">
                {[
                  { key: 'A', text: currentQuestion.optionA },
                  { key: 'B', text: currentQuestion.optionB },
                  { key: 'C', text: currentQuestion.optionC },
                  { key: 'D', text: currentQuestion.optionD }
                ].map(({ key, text }) => {
                  const isSelected = answers[currentQuestion.id] === key;
                  const isImageOption = text && (text.startsWith('data:image') || text.startsWith('http') || text.startsWith('/'));

                  return (
                    <button
                      key={key}
                      onClick={() => handleOptionClick(key)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-center space-x-4 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600/15 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                        isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {key}
                      </div>
                      <div className="text-sm font-medium flex-1">
                        {isImageOption ? (
                          <img src={text} alt={`Option ${key}`} className="max-h-24 object-contain rounded" />
                        ) : (
                          <LatexRenderer text={text} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-500">No question selected.</div>
          )}

          {/* Bottom Bar */}
          <footer className="border-t border-slate-850 bg-slate-900/80 px-6 py-4 flex items-center justify-between mt-auto shrink-0">
            <button
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
              className={`px-5 py-2 rounded-lg text-xs font-bold border transition ${
                currentQuestionIndex === 0
                  ? 'bg-slate-955 text-slate-600 border-slate-900 cursor-not-allowed'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Previous
            </button>

            <div className="flex space-x-3">
              {currentQuestion && answers[currentQuestion.id] && (
                <button
                  onClick={() => selectOption(currentQuestion.id, "")}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800 transition"
                >
                  Clear Selection
                </button>
              )}

              <button
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
                className="px-6 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition"
              >
                Save &amp; Next
              </button>
            </div>
          </footer>
        </main>

        {/* Right Sidebar: Palette */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col hidden lg:flex shrink-0">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Palette Summary</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-center">
                <p className="text-xl font-black text-emerald-400">{subjectCounters.answered}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Answered</p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-center">
                <p className="text-xl font-black text-rose-400">{subjectCounters.notAnswered}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Not Answered</p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-center">
                <p className="text-xl font-black text-slate-400">{subjectCounters.notVisited}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Not Visited</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Questions Navigation</h4>
            <div className="grid grid-cols-4 gap-2.5">
              {subjectQuestions.map((q, idx) => {
                const globalIdx = questions.findIndex(item => item.id === q.id);
                const isCurrent = currentQuestionIndex === globalIdx;
                const isAnswered = !!answers[q.id];
                const isVisited = visitedQuestions.has(q.id);

                let bgClass = "bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800";
                if (isAnswered) {
                  bgClass = "bg-emerald-600 text-white font-bold border-emerald-500";
                } else if (isVisited) {
                  bgClass = "bg-rose-600 text-white font-bold border-rose-500";
                }

                if (isCurrent) {
                  bgClass += " ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => handleGridQuestionClick(q.id)}
                    className={`h-10 rounded-lg text-xs font-bold flex items-center justify-center transition cursor-pointer ${bgClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Security Violation Warning Modal */}
      {showViolationModal && isExamActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-955/90 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-500/10 text-rose-500 animate-pulse">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-rose-500 tracking-wider uppercase">Security Violation Warning</h3>
              <p className="text-sm text-slate-300 font-medium">
                Security Policy Action Detected!
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5 text-left text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Violation Reason:</span>
                <span className="font-bold text-rose-400">{violationReason}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-2">
                <span className="text-slate-400 font-semibold">Total Violations Count:</span>
                <span className="font-black text-rose-500 text-sm bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">{violationsCount} / 5</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              PrintScreen, Snipping Tools, Window Focus loss, and shortcuts are strictly prohibited during the examination. Please click below to resume.
            </p>

            <button
              onClick={handleResumeFullscreen}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition duration-150 transform active:translate-y-0.5"
            >
              Resume Exam &amp; Re-enable Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Auto-Submit Warning Modal */}
      {showAutoSubmitModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-955 bg-opacity-95 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 text-center animate-pulse">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-500/10 text-rose-500">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-rose-500 tracking-wider uppercase">Exam Terminated</h3>
              <p className="text-sm text-slate-300 font-medium">
                Maximum security violations limit (5) exceeded.
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Your exam responses are being automatically submitted. Please wait...
            </p>
            <div className="flex items-center justify-center space-x-2 text-emerald-400 font-bold text-sm">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-emerald-500"></div>
              <span>Submitting SSC exam...</span>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation & Result Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            {submitSuccess ? (
              <div className="text-center space-y-4 py-2">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-extrabold text-slate-100">SSC CGL Exam Submitted!</h3>
                <p className="text-xs text-slate-400">
                  Your final performance evaluation report:
                </p>

                {submitResult && (
                  <div className="bg-slate-955/70 border border-slate-800 rounded-xl divide-y divide-slate-800 text-sm text-left">
                    <div className="flex justify-between items-center p-3">
                      <span className="text-slate-400 font-semibold">Total Score:</span>
                      <span className="font-extrabold text-emerald-400 text-lg">
                        {submitResult.finalScore} / {submitResult.totalQuestions * 2}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3">
                      <span className="text-slate-400">Correct Answers (+2 ea):</span>
                      <span className="font-extrabold text-emerald-400 text-base">{submitResult.correctCount}</span>
                    </div>
                    <div className="flex justify-between items-center p-3">
                      <span className="text-slate-400">Incorrect Answers (-0.5 ea):</span>
                      <span className="font-extrabold text-rose-400 text-base">{submitResult.incorrectCount}</span>
                    </div>
                    <div className="flex justify-between items-center p-3">
                      <span className="text-slate-400">Unattempted Questions:</span>
                      <span className="font-extrabold text-slate-400 text-base">{submitResult.unattemptedCount}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowSubmitModal(false);
                      router.push('/pages/dashboard/ssc-cgl');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition"
                  >
                    Back to SSC Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-rose-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-bold text-slate-100">Submit SSC CGL Exam?</h3>
                </div>

                <p className="text-xs text-slate-400">
                  Are you sure you want to finalize your exam submission? You will receive your evaluated scorecard based on official answer keys.
                </p>

                <div className="bg-slate-955/60 border border-slate-800 rounded-xl divide-y divide-slate-800">
                  <div className="flex justify-between items-center p-3 text-sm">
                    <span className="text-slate-400">Answered Questions:</span>
                    <span className="font-bold text-emerald-400">{answeredQuestionsCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 text-sm">
                    <span className="text-slate-400">Unattempted Questions:</span>
                    <span className="font-bold text-slate-400">{unattemptedQuestionsCount}</span>
                  </div>
                </div>

                <div className="flex space-x-3 pt-3">
                  <button
                    onClick={() => setShowSubmitModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? <span>Submitting...</span> : <span>Confirm Submit</span>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SscTestWorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-955 flex items-center justify-center text-slate-400">Loading SSC workspace...</div>}>
      <SscTestWorkspaceContent />
    </Suspense>
  );
}
