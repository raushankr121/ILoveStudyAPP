import { getApiBaseUrl } from "./apiConfig";

const API_BASE = getApiBaseUrl();

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  isActiveToday: boolean;
  streakHistory: string[];
};

export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  targetExam: string;
  age: number | null;
  school: string;
  avatarUrl: string | null;
  currentStreak?: number;
  longestStreak?: number;
  lastActiveDate?: string | null;
  streakHistory?: string[];
};

async function handleJsonResponse(response: Response, defaultErrorMessage: string) {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    console.error(`Non-JSON response from ${response.url}:`, text);
    throw new Error(
      `Server error (${response.status}). The server returned an unexpected response. Please ensure the backend is running at ${API_BASE}.`
    );
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || defaultErrorMessage);
  }
  return data;
}

export async function syncUserProfile(data: {
  email: string;
  fullName: string;
  avatarUrl?: string | null;
}): Promise<{ token: string; profile: UserProfile }> {
  try {
    const response = await fetch(`${API_BASE}/api/profile/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await handleJsonResponse(response, "Failed to sync profile");

    localStorage.setItem("backendToken", result.token);
    localStorage.setItem("displayName", result.profile.fullName);
    localStorage.setItem("userEmail", result.profile.email);

    return result;
  } catch (error) {
    console.error("Profile API sync error:", error);
    if (error instanceof TypeError) {
      throw new Error(
        `Could not reach the backend server at ${API_BASE}. Make sure the backend is running and accessible.`
      );
    }
    throw error instanceof Error ? error : new Error("Failed to sync profile");
  }
}

export async function fetchProfile(): Promise<UserProfile> {
  const token = localStorage.getItem("backendToken");
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE}/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleJsonResponse(response, "Failed to fetch profile");
  return result.profile;
}

export async function updateProfile(
  data: Partial<Pick<UserProfile, "fullName" | "targetExam" | "age" | "school">>
): Promise<UserProfile> {
  const token = localStorage.getItem("backendToken");
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE}/api/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await handleJsonResponse(response, "Failed to update profile");
  localStorage.setItem("displayName", result.profile.fullName);
  return result.profile;
}

export const EXAM_OPTIONS = [
  "JEE Mains",
  "JEE Advanced",
  "NEET",
  "SSC CGL",
  "SSC CHSL",
  "UPSC",
  "GATE",
  "Other",
];

export type TestAttemptItem = {
  id: string;
  examName: string;
  shiftName: string;
  score: number;
  maxMarks: number;
  percentage: number;
  submittedAt: string;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
};

export type PerformanceSummary = {
  highestScoresByExam: Record<string, { score: number; maxMarks: number; percentage: number; shiftName: string; date: string }>;
  overallMaxScore: number;
  totalTestsTaken: number;
  averagePercentage: number;
  attempts: TestAttemptItem[];
};

export async function fetchTestPerformance(): Promise<PerformanceSummary> {
  const token = localStorage.getItem("backendToken");
  if (!token) {
    return {
      highestScoresByExam: {},
      overallMaxScore: 0,
      totalTestsTaken: 0,
      averagePercentage: 0,
      attempts: [],
    };
  }

  try {
    const response = await fetch(`${API_BASE}/api/profile/attempts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await handleJsonResponse(response, "Failed to fetch test performance");
    return result.performance;
  } catch (err) {
    console.warn("Using fallback/empty test performance data:", err);
    return {
      highestScoresByExam: {},
      overallMaxScore: 0,
      totalTestsTaken: 0,
      averagePercentage: 0,
      attempts: [],
    };
  }
}

export async function fetchStreakData(): Promise<StreakData> {
  const token = localStorage.getItem("backendToken");
  if (!token) {
    const todayStr = new Date().toISOString().split("T")[0];
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: new Date().toISOString(),
      isActiveToday: true,
      streakHistory: [todayStr],
    };
  }

  try {
    const response = await fetch(`${API_BASE}/api/profile/streak`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await handleJsonResponse(response, "Failed to fetch streak data");
    return result.streak;
  } catch (err) {
    console.warn("Fallback streak data used:", err);
    const todayStr = new Date().toISOString().split("T")[0];
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: new Date().toISOString(),
      isActiveToday: true,
      streakHistory: [todayStr],
    };
  }
}

export async function recordDailyCheckIn(): Promise<StreakData> {
  const token = localStorage.getItem("backendToken");
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_BASE}/api/profile/streak/check-in`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await handleJsonResponse(response, "Failed to record check-in");
  return result.streak;
}

