"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";

export default function YearWorkspaceClient() {
  const router = useRouter();
  const params = useParams();

  const currentYear = (params?.year as string) || "2026";

  return (
    <div className="p-8">
      <button
        onClick={() => router.push("/pages/dashboard/jee-mains?type=mains")}
        className="text-blue-600 mb-6 font-bold"
      >
        &larr; Back to Years List
      </button>

      <h1 className="text-3xl font-extrabold text-gray-800">
        JEE Mains - {currentYear} Workspace
      </h1>
      <p className="mt-2 text-gray-600">
        This single file handles every year automatically!
      </p>
    </div>
  );
}
