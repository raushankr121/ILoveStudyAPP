"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getApiBaseUrl } from '../../../../../lib/apiConfig';
import { useTest } from '../../../../context/TestContext';
import { LatexRenderer } from '../../../../components/LatexRenderer';

function TestWorkspacePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shiftId = searchParams.get('shiftId') || "";
  const name = searchParams.get('name') || "JEE Main Paper";
  const year = parseInt(searchParams.get('year') || "2025", 10);

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

  const [selectedSubject, setSelectedSubject] = useState<string>("Physics");
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set());
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

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
      console.error("Failed to submit exam:", err);
      alert("Failed to submit exam. Please try again.");
      setShowAutoSubmitModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runPreChecks = async () => {
    setInternetStatus('checking');
    setExtensionStatus('checking');

    // 1. Check internet connectivity
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

    // 2. Check extensions
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

    if (typeof window !== 'undefined') {
      if (window.hasOwnProperty('__adobe_pdf_viewer__')) {
        detectedExtensions.push("Adobe Acrobat");
      }
      if (window.hasOwnProperty('tampermonkey') || window.hasOwnProperty('greasemonkey')) {
        detectedExtensions.push("Tampermonkey / Greasemonkey");
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      // If the exam is active and they exited fullscreen, count it as a violation!
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

  // Security restrictions (right-click, screenshots, copy/paste, blur focus loss)
  useEffect(() => {
    if (!isExamActive || violationsCount >= 5) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (violationsCount >= 5) return;
      const isCopy = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c';
      const isPaste = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v';
      const isCut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x';
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
      const isWinScreenshot = (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's';
      const isMacScreenshot = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5');

      if (isCopy || isPaste || isCut || isPrintScreen || isWinScreenshot || isMacScreenshot) {
        e.preventDefault();
        setViolationsCount(prev => prev + 1);
        setViolationReason(
          isCopy ? "Attempted copy shortcut (Ctrl+C / Cmd+C)" :
          isPaste ? "Attempted paste shortcut (Ctrl+V / Cmd+V)" :
          isCut ? "Attempted cut shortcut (Ctrl+X / Cmd+X)" :
          isWinScreenshot || isMacScreenshot ? "Attempted OS-level screenshot shortcut (Meta+Shift+S / Cmd+Shift+3,4,5)" :
          "Attempted PrintScreen action"
        );
        setShowViolationModal(true);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (violationsCount >= 5) return;
      e.preventDefault();
      setViolationsCount(prev => prev + 1);
      setViolationReason("Attempted right-click (Context Menu)");
      setShowViolationModal(true);
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', 'Security Violation recorded. Copy/Paste is disabled.');
      }
    };

    const handleBlur = () => {
      if (violationsCount >= 5 || isSubmitting || submitSuccess) return;
      setViolationsCount(prev => prev + 1);
      setViolationReason("Window focus lost (possible screenshot tool or navigation)");
      setShowViolationModal(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isExamActive, violationsCount, isSubmitting, submitSuccess]);

  useEffect(() => {
    if (isExamActive && violationsCount >= 5 && !showAutoSubmitModal) {
      setShowAutoSubmitModal(true);
      handleFinalSubmit();
    }
  }, [violationsCount, isExamActive, showAutoSubmitModal]);

  const handleResumeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error enabling full-screen:", err);
      });
      setIsFullscreen(true);
    }
    setShowViolationModal(false);
  };

  const startExamAndEnableFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error enabling full-screen:", err);
      });
      setIsFullscreen(true);
    }
    setIsExamActive(true);
    setShowPreCheck(false);
  };

  // Exam stats calculations
  const totalQuestionsCount = questions.length;
  const answeredQuestionsCount = questions.filter(q => answers[q.id]).length;
  const remainingQuestionsCount = totalQuestionsCount - answeredQuestionsCount;
  const unattemptedQuestionsCount = questions.filter(q => !answers[q.id] && !visitedQuestions.has(q.id)).length;

  // 1. Load shift questions from database on mount
  useEffect(() => {
    if (shiftId) {
      loadShift(shiftId, name, year);
    }
  }, [shiftId]);

  // 2. Track visited questions & handle subject initialization when questions load
  useEffect(() => {
    if (questions.length > 0) {
      // Find first available subject and set it
      const uniqueSubjects = Array.from(new Set(questions.map(q => q.subject)));
      if (uniqueSubjects.length > 0 && !uniqueSubjects.includes(selectedSubject)) {
        setSelectedSubject(uniqueSubjects[0]);
      }
    }
  }, [questions]);

  // 3. Mark current question as visited
  useEffect(() => {
    if (questions.length > 0 && questions[currentQuestionIndex]) {
      const activeQ = questions[currentQuestionIndex];
      setVisitedQuestions(prev => {
        const next = new Set(prev);
        next.add(activeQ.id);
        return next;
      });
      // Switch tab if the active question index is changed from outside (e.g. clicking global index)
      if (activeQ.subject !== selectedSubject) {
        setSelectedSubject(activeQ.subject);
      }
    }
  }, [currentQuestionIndex, questions]);

  // 4. Per-question timer tracking
  useEffect(() => {
    if (questions.length === 0 || loading || examTimeLeft <= 0 || !isExamActive) return;
    
    const interval = setInterval(() => {
      if (questions[currentQuestionIndex]) {
        const qId = questions[currentQuestionIndex].id;
        setQuestionTimers(prev => ({
          ...prev,
          [qId]: (prev[qId] || 0) + 1
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestionIndex, questions, loading, examTimeLeft, isExamActive]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-lg font-semibold tracking-wider animate-pulse">Loading Question Bank...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-2">No Questions Found</h2>
        <p className="text-gray-400 mb-6">We could not load any questions for this shift from the server.</p>
        <button onClick={() => router.push('/pages/dashboard/jee-mains?type=mains')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg transition">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (showPreCheck) {
    return (
      <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col font-sans select-none items-center justify-center p-6 relative">
        <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 mb-2">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black tracking-wide text-slate-100 uppercase">System Readiness Check</h1>
            <p className="text-sm text-slate-400">Please complete the required system checks to start the exam.</p>
          </div>

          {/* Cards for checks */}
          <div className="space-y-4">
            
            {/* Internet connection check card */}
            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-2.5 rounded-lg ${
                  internetStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400' :
                  internetStatus === 'checking' ? 'bg-slate-800 text-slate-400 animate-pulse' :
                  'bg-rose-500/10 text-rose-400'
                }`}>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Internet Connectivity</h3>
                  <p className="text-xs text-slate-500">
                    {internetStatus === 'checking' && 'Checking connection status...'}
                    {internetStatus === 'connected' && 'Secure internet connection established.'}
                    {internetStatus === 'limited' && 'Connection detected, but server response is slow.'}
                    {internetStatus === 'disconnected' && 'No internet connection detected. Please verify link.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                {internetStatus === 'checking' && (
                  <span className="text-xs font-semibold text-slate-400 animate-pulse">Checking...</span>
                )}
                {internetStatus === 'connected' && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Passed</span>
                )}
                {internetStatus === 'limited' && (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">Slow</span>
                )}
                {internetStatus === 'disconnected' && (
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">Failed</span>
                )}
              </div>
            </div>

            {/* Extension check card */}
            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2.5 rounded-lg ${
                    extensionStatus === 'clean' ? 'bg-emerald-500/10 text-emerald-400' :
                    extensionStatus === 'checking' ? 'bg-slate-800 text-slate-400 animate-pulse' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Browser Integrity (Extensions)</h3>
                    <p className="text-xs text-slate-500">
                      {extensionStatus === 'checking' && 'Scanning injected styles/scripts...'}
                      {extensionStatus === 'clean' && 'No suspicious extension styles/injectors detected.'}
                      {extensionStatus === 'warning' && `Detected ${detectedExts.length} extensions active.`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  {extensionStatus === 'checking' && (
                    <span className="text-xs font-semibold text-slate-400 animate-pulse">Scanning...</span>
                  )}
                  {extensionStatus === 'clean' && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Passed</span>
                  )}
                  {extensionStatus === 'warning' && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">Warning</span>
                  )}
                </div>
              </div>

              {extensionStatus === 'warning' && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {detectedExts.map((ext, idx) => (
                      <span key={idx} className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300 font-mono text-[10px]">
                        {ext}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <strong>Notice:</strong> Browser security sandboxing prevents regular websites from disabling extensions automatically. To ensure exam integrity and prevent interference, please manually disable active extensions (like Grammarly, Adblockers, PDF tools) by opening your browser extension settings (e.g. <code>chrome://extensions</code>) and click the refresh button below.
                  </p>
                </div>
              )}
            </div>

            {/* Fullscreen check card */}
            <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 20v-4m0 4h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Fullscreen Mode</h3>
                  <p className="text-xs text-slate-500">Will automatically transition to full screen on exam start.</p>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">Auto-Enable</span>
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex space-x-4 pt-4 border-t border-slate-800">
            <button
              onClick={runPreChecks}
              disabled={internetStatus === 'checking' || extensionStatus === 'checking'}
              className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-semibold py-3 px-4 rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
              </svg>
              <span>Refresh Checks</span>
            </button>
            
            <button
              onClick={startExamAndEnableFullscreen}
              disabled={internetStatus === 'disconnected'}
              className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center space-x-2"
            >
              <span>Proceed &amp; Start Exam &rarr;</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Get list of unique subjects
  const subjects = Array.from(new Set(questions.map(q => q.subject)));

  // Get index-based numbers for questions filtered by subject
  const subjectQuestions = questions.filter(q => q.subject === selectedSubject);
  const activeQuestion = questions[currentQuestionIndex];

  // Helper to format remaining time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to toggle full screen
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

  // Subject tab click handler
  const handleSubjectTabClick = (sub: string) => {
    setSelectedSubject(sub);
    // Find index of first question in the global list for this subject
    const firstIndex = questions.findIndex(q => q.subject === sub);
    if (firstIndex !== -1) {
      setCurrentQuestionIndex(firstIndex);
    }
  };

  // Question selection from grid
  const handleGridQuestionClick = (qId: string) => {
    const globalIdx = questions.findIndex(q => q.id === qId);
    if (globalIdx !== -1) {
      setCurrentQuestionIndex(globalIdx);
    }
  };

  // Clear current response
  const handleClearResponse = () => {
    if (activeQuestion) {
      selectOption(activeQuestion.id, "");
    }
  };

  // Navigate to previous question of current subject
  const handlePrevQuestion = () => {
    const currentSubIdx = subjectQuestions.findIndex(q => q.id === activeQuestion.id);
    if (currentSubIdx > 0) {
      const prevQ = subjectQuestions[currentSubIdx - 1];
      const globalIdx = questions.findIndex(q => q.id === prevQ.id);
      if (globalIdx !== -1) {
        setCurrentQuestionIndex(globalIdx);
      }
    }
  };

  // Navigate to next question of current subject
  const handleNextQuestion = () => {
    const currentSubIdx = subjectQuestions.findIndex(q => q.id === activeQuestion.id);
    if (currentSubIdx < subjectQuestions.length - 1) {
      const nextQ = subjectQuestions[currentSubIdx + 1];
      const globalIdx = questions.findIndex(q => q.id === nextQ.id);
      if (globalIdx !== -1) {
        setCurrentQuestionIndex(globalIdx);
      }
    }
  };

  // NTA Status counters for the current subject
  const subjectCounters = {
    answered: subjectQuestions.filter(q => answers[q.id]).length,
    notAnswered: subjectQuestions.filter(q => !answers[q.id] && visitedQuestions.has(q.id)).length,
    notVisited: subjectQuestions.filter(q => !answers[q.id] && !visitedQuestions.has(q.id)).length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden h-screen">
      {/* Top Navbar header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex justify-between items-center shrink-0">
        <div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                if (confirm("Are you sure you want to exit the exam? Your progress is saved.")) {
                  router.push('/pages/dashboard/jee-mains?type=mains');
                }
              }} 
              className="text-slate-400 hover:text-white transition text-xs font-semibold uppercase tracking-wider"
            >
              &larr; Exit Exam
            </button>
            <span className="text-slate-700">|</span>
            <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-2 py-0.5 rounded border border-indigo-500/20">
              {year} Attempt
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-100 mt-1">{name}</h1>
        </div>

        {/* Floating Timer Console */}
        <div className="flex items-center space-x-6">
          <div className="bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl flex items-center space-x-3 shadow-inner">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Time Left:</span>
            <span className={`font-mono text-xl font-bold tracking-widest ${examTimeLeft < 600 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
              {formatTime(examTimeLeft)}
            </span>
          </div>

          {!isFullscreen && (
            <button 
              onClick={handleToggleFullscreen}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg transition"
              title="Toggle Fullscreen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 20v-4m0 4h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            </button>
          )}

          <button 
            onClick={() => setShowSubmitModal(true)}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg hover:shadow-red-500/20 transition duration-150 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Main Body Grid */}
      <div className="flex-1 flex overflow-hidden w-full">
        
        {/* Left Side Panel: Question view & tabs */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden border-r border-slate-900">
          
          {/* Subject Switch Tabs */}
          <div className="bg-slate-900/50 border-b border-slate-900/80 px-6 py-2.5 flex space-x-2 shrink-0">
            {subjects.map((sub) => {
              const isActive = selectedSubject === sub;
              return (
                <button
                  key={sub}
                  onClick={() => handleSubjectTabClick(sub)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  {sub === 'Math' ? 'Mathematics' : sub}
                </button>
              );
            })}
          </div>

          {/* Question and Option Screen Box */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Question card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                  <span className="text-indigo-400 font-bold text-sm tracking-wide uppercase">
                    Question {subjectQuestions.findIndex(q => q.id === activeQuestion.id) + 1} of {subjectQuestions.length}
                  </span>
                  <div className="flex items-center space-x-4 text-xs text-slate-400">
                    <span>Marks: <strong className="text-emerald-400">+4</strong> / <strong className="text-red-400">-1</strong></span>
                    <span>•</span>
                    <span>Time Spent: <strong className="text-slate-200">{questionTimers[activeQuestion.id] || 0}s</strong></span>
                  </div>
                </div>

                <div className="text-slate-100 text-base leading-relaxed whitespace-pre-line">
                  <LatexRenderer text={activeQuestion.questionText} />
                </div>

                {activeQuestion.imageUrl && (
                  <div className="mt-4 border border-slate-800 rounded-lg p-4 bg-slate-950 flex justify-center">
                    <img 
                      src={activeQuestion.imageUrl.startsWith('http') || activeQuestion.imageUrl.startsWith('/') ? activeQuestion.imageUrl : `/${activeQuestion.imageUrl}`} 
                      alt="Question Diagram" 
                      className="max-h-72 object-contain" 
                    />
                  </div>
                )}
              </div>

              {/* Options or Numerical Input lists */}
              {(() => {
                const getNumericVal = (str?: string | null) => {
                  if (!str) return "";
                  const match = str.toString().match(/\(?[1-4]?\)?\s*(-?\d+(\.\d+)?)/);
                  return match ? match[1] : str.toString().trim();
                };

                const isNumerical =
                  !activeQuestion.optionA ||
                  !activeQuestion.optionB ||
                  !activeQuestion.optionC ||
                  !activeQuestion.optionD ||
                  (getNumericVal(activeQuestion.optionA) === getNumericVal(activeQuestion.optionB));

                if (isNumerical) {
                  return (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <span className="h-3 w-3 rounded-full bg-indigo-500 animate-pulse"></span>
                        <label className="text-sm font-bold text-indigo-300 uppercase tracking-wider">
                          Numerical Answer Input
                        </label>
                      </div>
                      <p className="text-xs text-slate-400">
                        This is a Section B Numerical Question. Enter your calculated integer or decimal value below.
                      </p>
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                          type="text"
                          value={answers[activeQuestion.id] || ''}
                          onChange={(e) => selectOption(activeQuestion.id, e.target.value)}
                          placeholder="Enter numerical response (e.g., 5120, 14)..."
                          className="w-full sm:w-80 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-100 text-lg font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                        />
                        {answers[activeQuestion.id] && (
                          <button
                            onClick={() => selectOption(activeQuestion.id, '')}
                            className="px-4 py-3 border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition"
                          >
                            Clear Value
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {[
                      { key: 'A', value: activeQuestion.optionA },
                      { key: 'B', value: activeQuestion.optionB },
                      { key: 'C', value: activeQuestion.optionC },
                      { key: 'D', value: activeQuestion.optionD }
                    ].map((opt) => {
                      const isSelected = answers[activeQuestion.id] === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => selectOption(activeQuestion.id, opt.key)}
                          className={`group flex items-center p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/5'
                              : 'bg-slate-900 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-850/50'
                          }`}
                        >
                          <span className={`h-8 w-8 rounded-lg font-bold flex items-center justify-center mr-4 transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-950 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200'
                          }`}>
                            {opt.key}
                          </span>
                          <div className={`text-sm ${isSelected ? 'text-indigo-200 font-semibold' : 'text-slate-300'}`}>
                            <LatexRenderer text={opt.value} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>
          </div>

          {/* Bottom Bar: Action buttons */}
          <footer className="bg-slate-900 border-t border-slate-850 px-6 py-4 flex justify-between items-center shrink-0">
            <button
              onClick={handlePrevQuestion}
              disabled={subjectQuestions.findIndex(q => q.id === activeQuestion.id) === 0}
              className="px-5 py-2.5 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-sm font-semibold transition"
            >
              &larr; Previous Question
            </button>

            <button
              onClick={handleClearResponse}
              disabled={!answers[activeQuestion.id]}
              className="px-5 py-2.5 border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-sm font-semibold transition"
            >
              Clear Response
            </button>

            <button
              onClick={handleNextQuestion}
              disabled={subjectQuestions.findIndex(q => q.id === activeQuestion.id) === subjectQuestions.length - 1}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:pointer-events-none rounded-lg text-sm font-bold shadow-md shadow-indigo-600/10 transition"
            >
              Save &amp; Next &rarr;
            </button>
          </footer>
        </main>

        {/* Right Side Panel: question navigation grid & summary info */}
        <aside className="w-80 shrink-0 bg-slate-900 flex flex-col overflow-hidden h-full">
          
          {/* Header section status summary */}
          <div className="p-5 border-b border-slate-800 space-y-4 shrink-0">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              {selectedSubject === 'Math' ? 'Mathematics' : selectedSubject} Summary
            </h3>
            
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-center">
                <p className="text-xl font-black text-emerald-400">{subjectCounters.answered}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Answered</p>
              </div>
              
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-center">
                <p className="text-xl font-black text-red-400">{subjectCounters.notAnswered}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Visited</p>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-center">
                <p className="text-xl font-black text-slate-400">{subjectCounters.notVisited}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Not Visited</p>
              </div>
            </div>
          </div>

          {/* Grid of question buttons */}
          <div className="flex-1 overflow-y-auto p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Question Navigation</h4>
            
            <div className="grid grid-cols-4 gap-3">
              {subjectQuestions.map((q, idx) => {
                const globalIdx = questions.findIndex(item => item.id === q.id);
                const isCurrent = currentQuestionIndex === globalIdx;
                const isAnswered = !!answers[q.id];
                const isVisited = visitedQuestions.has(q.id);

                let bgClass = "bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800";
                if (isAnswered) {
                  bgClass = "bg-emerald-600 text-white font-semibold border-emerald-500 shadow-md shadow-emerald-600/10";
                } else if (isVisited) {
                  bgClass = "bg-red-600 text-white font-semibold border-red-500 shadow-md shadow-red-600/10";
                }

                if (isCurrent) {
                  bgClass += " ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => handleGridQuestionClick(q.id)}
                    className={`h-11 rounded-lg text-sm font-bold flex items-center justify-center transition-all duration-150 cursor-pointer ${bgClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

        </aside>

      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 transform scale-100 transition-all">
            
            {submitSuccess ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-100">Exam Submitted!</h3>
                <p className="text-sm text-slate-400">
                  Your exam has been submitted successfully. Here is your performance:
                </p>

                {submitResult && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl divide-y divide-slate-800 text-sm text-left">
                    <div className="flex justify-between items-center p-3">
                      <span className="text-slate-400 font-semibold">Total Score:</span>
                      <span className="font-extrabold text-indigo-400 text-lg">{submitResult.finalScore} / {submitResult.totalQuestions * 4}</span>
                    </div>
                    <div className="flex justify-between items-center p-3">
                      <span className="text-slate-400">Correct Answers:</span>
                      <span className="font-extrabold text-emerald-400 text-base">{submitResult.correctCount}</span>
                    </div>
                    <div className="flex justify-between items-center p-3">
                      <span className="text-slate-400">Incorrect Answers:</span>
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
                      router.push('/pages/dashboard/jee-mains?type=mains');
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl transition duration-150 shadow-lg shadow-indigo-600/10"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-rose-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-bold text-slate-100">Are you sure you want to submit?</h3>
                </div>
                
                <p className="text-sm text-slate-400">
                  You are about to finalize and submit your exam. Once submitted, you cannot change any answers.
                </p>

                {/* Statistics Table */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl divide-y divide-slate-800">
                  <div className="flex justify-between items-center p-3 text-sm">
                    <span className="text-slate-400">Questions Answered:</span>
                    <span className="font-extrabold text-emerald-400 text-base">{answeredQuestionsCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 text-sm">
                    <span className="text-slate-400">Questions Remaining:</span>
                    <span className="font-extrabold text-amber-400 text-base">{remainingQuestionsCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 text-sm">
                    <span className="text-slate-400">Unattempted Questions:</span>
                    <span className="font-extrabold text-slate-400 text-base">{unattemptedQuestionsCount}</span>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-slate-800/60">
                  <button
                    onClick={() => setShowSubmitModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-xl border border-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-red-500/20 transition flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Yes, Submit</span>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Security Violation Modal */}
      {showViolationModal && isExamActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-955/90 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-red-500 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 text-center">
            
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 text-red-500 animate-pulse">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-red-500 tracking-wider uppercase">Exam Security Warning</h3>
              <p className="text-sm text-slate-300 font-medium">
                A system security violation has been recorded!
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5 text-left text-xs text-slate-300 font-sans">
              <div className="flex justify-between">
                <span className="text-slate-400">Violation Reason:</span>
                <span className="font-bold text-red-400">{violationReason}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-2">
                <span className="text-slate-400 font-semibold">Total Violations Count:</span>
                <span className="font-black text-red-500 text-sm bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{violationsCount}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Exiting fullscreen or using copy/paste/screenshot shortcuts is strictly prohibited during the exam. Please click the button below to resume.
            </p>

            <button
              onClick={handleResumeFullscreen}
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-red-500/25 transition duration-150 transform active:translate-y-0.5"
            >
              Resume Exam &amp; Re-enable Fullscreen
            </button>

          </div>
        </div>
      )}

      {/* Auto-Submit Warning Modal */}
      {showAutoSubmitModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-955 bg-opacity-95 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-red-500 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 text-center animate-pulse">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 text-red-500">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-red-500 tracking-wider uppercase">Exam Terminated</h3>
              <p className="text-sm text-slate-300 font-medium">
                Maximum violations limit (5) exceeded.
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Your exam responses are being automatically submitted. Please wait...
            </p>
            <div className="flex items-center justify-center space-x-2 text-indigo-400 font-bold text-sm">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>
              <span>Submitting exam...</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function TestWorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading workspace...</div>}>
      <TestWorkspacePageContent />
    </Suspense>
  );
}
