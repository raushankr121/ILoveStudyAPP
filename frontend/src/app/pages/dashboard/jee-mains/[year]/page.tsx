import YearWorkspaceClient from "./YearWorkspaceClient";

export function generateStaticParams() {
  return [
    { year: "2022" },
    { year: "2023" },
    { year: "2024" },
    { year: "2025" },
    { year: "2026" },
  ];
}

export default function YearWorkspacePage() {
  return <YearWorkspaceClient />;
}