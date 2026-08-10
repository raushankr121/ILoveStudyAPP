"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../../lib/apiConfig';

interface Question {
  id: string;
  subject: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  imageUrl?: string | null;
}

interface TestContextType {
  questions: Question[];
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (index: number) => void;
  answers: Record<string, string>;
  selectOption: (questionId: string, option: string) => void;
  examTimeLeft: number;
  questionTimers: Record<string, number>;
  setQuestionTimers: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  submitFinalExam: () => Promise<void>;
  activeShiftId: string;
  activeShiftName: string;
  activeShiftYear: number | null;
  loading: boolean;
  loadShift: (shiftId: string, name: string, year: number) => Promise<void>;
  isExamActive: boolean;
  setIsExamActive: (val: boolean) => void;
}

const TestContext = createContext<TestContextType | undefined>(undefined);

export const TestProvider = ({ children }: { children: React.ReactNode }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [examTimeLeft, setExamTimeLeft] = useState<number>(10800); // 3 Hours
  const [questionTimers, setQuestionTimers] = useState<Record<string, number>>({});
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isExamActive, setIsExamActive] = useState<boolean>(false);
  
  const [activeShiftId, setActiveShiftId] = useState<string>("");
  const [activeShiftName, setActiveShiftName] = useState<string>("");
  const [activeShiftYear, setActiveShiftYear] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Master countdown tracking loop
  useEffect(() => {
    if (examTimeLeft <= 0 || activeShiftId === "" || !isExamActive) return;
    const masterClock = setInterval(() => {
      setExamTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(masterClock);
  }, [examTimeLeft, activeShiftId, isExamActive]);

  // Load questions for a specific shift from the database
  const loadShift = async (shiftId: string, name: string, year: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || 'SIMULATED_TOKEN';
      const response = await axios.get(`${getApiBaseUrl()}/api/exams/shifts/${shiftId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const shiftData = response.data;
      setQuestions(shiftData.questions || []);
      setActiveShiftId(shiftId);
      setActiveShiftName(name);
      setActiveShiftYear(year);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setQuestionTimers({});
      setExamTimeLeft(10800); // Reset countdown to 3 hours
      setIsExamActive(false); // Reset to false on reload
    } catch (err) {
      console.error("Failed to load shift questions:", err);
      alert("Failed to load questions for this shift.");
    } finally {
      setLoading(false);
    }
  };

  // Integrated Fire-and-Forget Network synchronization method
  const selectOption = async (questionId: string, option: string) => {
    // 1. Optimistically update local client-side UI immediately for zero input lag
    setAnswers((prev) => ({ ...prev, [questionId]: option }));

    try {
      const token = localStorage.getItem('token') || 'SIMULATED_TOKEN';
      // 2. Stream payload directly into our high-performance Redis cache backend
      await axios.post(`${getApiBaseUrl()}/api/test/save-answer`, {
        shiftId: activeShiftId,
        questionId,
        selectedOption: option,
        timeSpent: questionTimers[questionId] || 0
      }, {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
    } catch (err) {
      console.error("Failed to sync selection to Redis backing cache:", err);
    }
  };

  // Final Exam submission wrapper
  const submitFinalExam = async (): Promise<any> => {
    const token = localStorage.getItem('token') || 'SIMULATED_TOKEN';
    const response = await axios.post(`${getApiBaseUrl()}/api/test/submit`, {
      shiftId: activeShiftId
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setIsExamActive(false); // Disable exam timer on submission
    return response.data;
  };

  return (
    <TestContext.Provider value={{
      questions, currentQuestionIndex, setCurrentQuestionIndex,
      answers, selectOption, examTimeLeft, questionTimers, setQuestionTimers, isFullscreen, setIsFullscreen,
      submitFinalExam, activeShiftId, activeShiftName, activeShiftYear, loading, loadShift,
      isExamActive, setIsExamActive
    }}>
      {children}
    </TestContext.Provider>
  );
};

export const useTest = () => {
  const context = useContext(TestContext);
  if (!context) throw new Error("useTest must be used within a TestProvider");
  return context;
};