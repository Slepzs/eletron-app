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
      <SectionCard eyebrow="Run Details" title="Loading">
        <p style={{ color: "#94a3b8", margin: 0 }}>
          Fetching the latest runtime view for this run.
        </p>
      </SectionCard>
    );
  }

  if (!details) {
    return (
      <SectionCard eyebrow="Run Details" title="No Run Selected">
        <p style={{ color: "#94a3b8", margin: 0 }}>
          Pick a run from the history list or start a new task to inspect planner, implementer,
          reviewer, and verification state.
        </p>
      </SectionCard>
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
          <button onClick={onCancelRun} style={runActionButtonStyle("#7c2d12")} type="button">
            Cancel run
          </button>
        ) : null}
        {canRetry ? (
          <button onClick={onRetryRun} style={runActionButtonStyle("#0f766e")} type="button">
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
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        }}
      >
        <VerdictCard verdict={details.latestVerdict} />
        <VerificationResultCard result={details.latestVerificationResult} />
      </div>
      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
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

function runActionButtonStyle(background: string): CSSProperties {
  return {
    background,
    border: "none",
    borderRadius: "999px",
    color: "#f8fafc",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 700,
    padding: "0.7rem 1rem",
  };
}
