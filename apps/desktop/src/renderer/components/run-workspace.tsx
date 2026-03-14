import type { ApprovalRequest, RuntimeRunDetails } from "@iamrobot/protocol";
import {
  ApprovalQueueCard,
  ArtifactListCard,
  EventTimelineCard,
  RunOverviewCard,
  SectionCard,
  SessionListCard,
  VerdictCard,
  VerificationResultCard,
} from "@iamrobot/ui";
import type { CSSProperties } from "react";

export interface RunWorkspaceProps {
  readonly details: RuntimeRunDetails | null;
  readonly error: string | null;
  readonly loading: boolean;
  readonly onApprove: (approvalRequestId: ApprovalRequest["approvalRequestId"]) => void;
  readonly onCancelRun: () => void;
  readonly onReject: (approvalRequestId: ApprovalRequest["approvalRequestId"]) => void;
  readonly onRetryRun: () => void;
  readonly resolvingApprovalId: ApprovalRequest["approvalRequestId"] | null;
}

export function RunWorkspace({
  details,
  error,
  loading,
  onApprove,
  onCancelRun,
  onReject,
  onRetryRun,
  resolvingApprovalId,
}: RunWorkspaceProps) {
  if (error) {
    return (
      <SectionCard eyebrow="Run Details" title="Unavailable">
        <p style={{ color: "#fecaca", margin: 0 }}>{error}</p>
      </SectionCard>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          alignItems: "center",
          border: "1px dashed rgba(148, 163, 184, 0.12)",
          borderRadius: "var(--radius-lg)",
          color: "#64748b",
          display: "flex",
          justifyContent: "center",
          minHeight: "200px",
          padding: "2rem",
        }}
      >
        <p style={{ fontSize: "0.88rem", margin: 0 }}>Loading run details…</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div
        style={{
          alignItems: "center",
          border: "1px dashed rgba(148, 163, 184, 0.18)",
          borderRadius: "var(--radius-lg)",
          color: "#64748b",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          justifyContent: "center",
          minHeight: "320px",
          padding: "3rem",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.95rem", margin: 0 }}>No run selected</p>
        <p style={{ color: "#475569", fontSize: "0.82rem", margin: 0, maxWidth: "36ch" }}>
          Pick a run from the history or create a new task to begin.
        </p>
      </div>
    );
  }

  const hasPendingApproval = details.approvalRequests.some(
    (request) => request.decision === "pending",
  );
  const canRetry = details.run.status === "blocked" || details.run.status === "failed";
  const canCancel = details.run.status === "in_progress";

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <RunOverviewCard details={details} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        {canCancel ? (
          <button onClick={onCancelRun} style={runActionButtonStyle("cancel")} type="button">
            Cancel run
          </button>
        ) : null}
        {canRetry ? (
          <button onClick={onRetryRun} style={runActionButtonStyle("retry")} type="button">
            Retry run
          </button>
        ) : null}
        {hasPendingApproval ? (
          <span
            style={{
              alignItems: "center",
              color: "#fbbf24",
              display: "inline-flex",
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
            Approval required before the run can proceed.
          </span>
        ) : null}
      </div>
      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <VerdictCard verdict={details.latestVerdict} details={details} />
        <VerificationResultCard result={details.latestVerificationResult} />
      </div>
      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <ApprovalQueueCard
          onApprove={onApprove}
          onReject={onReject}
          requests={details.approvalRequests}
          resolvingApprovalId={resolvingApprovalId}
        />
        <SessionListCard sessions={details.sessions} />
      </div>
      <ArtifactListCard artifacts={details.artifacts} />
      <EventTimelineCard events={details.events} />
    </div>
  );
}

function runActionButtonStyle(variant: "cancel" | "retry"): CSSProperties {
  const isCancel = variant === "cancel";
  return {
    background: isCancel ? "rgba(239, 68, 68, 0.12)" : "rgba(20, 184, 166, 0.12)",
    border: isCancel ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(20, 184, 166, 0.4)",
    borderRadius: "var(--radius-md)",
    color: isCancel ? "#fca5a5" : "#5eead4",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
    letterSpacing: "0.03em",
    padding: "0.6rem 0.9rem",
    transition: "background 150ms ease, border-color 150ms ease",
  };
}
