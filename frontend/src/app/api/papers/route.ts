// src/app/api/papers/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

// 1. We securely store the JSON dataset on the server
const mockPaperData = {
  "paperId": "2026-math-practice-001",
  "year": 2026,
  "exam": "JEE Main",
  "shift": 1,
  "date": "2026-07-17",
  "questions": [
    {
      "id": 1,
      "subject": "Mathematics",
      "type": "mcq",
      "questionText": "Let a1, a2, a3, … be a G.P. of increasing positive terms. If a1a5 = 28 and a2 + a4 = 29, then a6 is equal to:",
      "options": ["628", "812", "526", "784"],
      "correctOptionIndex": 3,
      "marks": 4,
      "negativeMarks": -1,
      "image": null
    }
  ]
};

// 2. The GET function creates the secure API endpoint
export async function GET() {
  // This sends the JSON data down to the client as a clean API response
  return NextResponse.json(mockPaperData);
}