"use client";

import { useEffect } from 'react';
import { getApiBaseUrl } from '../../lib/apiConfig';

const ExamDashboard = () => {
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${getApiBaseUrl()}/api/exams`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch exams');
        
        const data = await response.json();
        console.log("Exams loaded:", data);
        // You will later set this data into your Zustand store
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }
    };
    fetchExams();
  }, []);

  return (
    <div className="dashboard-container">
      <h1>Available Exams</h1>
      {/* Map through your exams here */}
    </div>
  );
};

export default ExamDashboard;