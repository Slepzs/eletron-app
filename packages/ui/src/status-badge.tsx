import type { RunStatus } from "@iamrobot/protocol";

export interface StatusBadgeProps {
  readonly status: RunStatus;
}

interface BadgeStyle {
  color: string;
  bg: string;
}

function getBadgeStyle(status: string): BadgeStyle {
  switch (status) {
    case "in_progress":
      return { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)" };
    case "completed":
    case "succeeded":
    case "success":
      return { color: "#4ade80", bg: "rgba(74, 222, 128, 0.12)" };
    case "failed":
    case "blocked":
      return { color: "#f87171", bg: "rgba(248, 113, 113, 0.12)" };
    case "pending":
    case "waiting":
    case "queued":
      return { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.12)" };
    default:
      return { color: "#94a3b8", bg: "rgba(148, 163, 184, 0.12)" };
  }
}

function getBadgeLabel(status: string): string {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "completed":
    case "succeeded":
      return "Completed";
    case "success":
      return "Completed";
    case "failed":
      return "Failed";
    case "blocked":
      return "Blocked";
    case "pending":
      return "Pending";
    case "waiting":
      return "Waiting";
    case "queued":
      return "Queued";
    default:
      return status;
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { color, bg } = getBadgeStyle(status);

  return (
    <span
      style={{
        background: bg,
        border: `1px solid ${color}33`,
        borderRadius: "var(--radius-pill)",
        color: color,
        display: "inline-block",
        fontSize: "0.66rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        padding: "0.22rem 0.5rem",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {getBadgeLabel(status)}
    </span>
  );
}
