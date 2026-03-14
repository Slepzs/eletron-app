import type { RunStatus } from "@iamrobot/protocol";

const runStatusLabel: Record<RunStatus, string> = {
  blocked: "Blocked",
  failed: "Failed",
  in_progress: "In Progress",
  succeeded: "Succeeded",
};

const runStatusColor: Record<RunStatus, string> = {
  blocked: "#b45309",
  failed: "#b91c1c",
  in_progress: "#0369a1",
  succeeded: "#15803d",
};

export interface StatusBadgeProps {
  readonly status: RunStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      style={{
        border: `1px solid ${runStatusColor[status]}`,
        borderRadius: "999px",
        color: runStatusColor[status],
        display: "inline-flex",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        padding: "0.35rem 0.6rem",
        textTransform: "uppercase",
      }}
    >
      {runStatusLabel[status]}
    </span>
  );
}
