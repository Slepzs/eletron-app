import type { ApprovalRequest } from "@iamrobot/protocol";
import type { CSSProperties } from "react";

import { formatTimestamp } from "./runtime-formatting";
import { SectionCard } from "./section-card";

export interface ApprovalQueueCardProps {
  readonly onApprove: (approvalRequestId: ApprovalRequest["approvalRequestId"]) => void;
  readonly onReject: (approvalRequestId: ApprovalRequest["approvalRequestId"]) => void;
  readonly requests: readonly ApprovalRequest[];
  readonly resolvingApprovalId: ApprovalRequest["approvalRequestId"] | null;
}

export function ApprovalQueueCard({
  onApprove,
  onReject,
  requests,
  resolvingApprovalId,
}: ApprovalQueueCardProps) {
  return (
    <SectionCard eyebrow="Approvals" title="Policy gates">
      {requests.length === 0 ? (
        <p style={{ color: "#94a3b8", margin: 0 }}>No approval requests are waiting for input.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {requests.map((request) => {
            const isResolving = resolvingApprovalId === request.approvalRequestId;

            return (
              <article
                key={request.approvalRequestId}
                style={{
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "16px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    alignItems: "flex-start",
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0 }}>{request.title}</h3>
                    <p style={{ color: "#94a3b8", margin: "0.35rem 0 0" }}>{request.description}</p>
                  </div>
                  <span
                    style={{
                      border: "1px solid rgba(245, 158, 11, 0.5)",
                      borderRadius: "999px",
                      color: "#fbbf24",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      padding: "0.3rem 0.65rem",
                      textTransform: "uppercase",
                    }}
                  >
                    {request.kind}
                  </span>
                </div>
                <p style={{ color: "#64748b", fontSize: "0.8rem", margin: "0.75rem 0 0" }}>
                  Requested {formatTimestamp(request.requestedAt)}
                </p>
                {request.decision === "pending" ? (
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.95rem" }}>
                    <button
                      disabled={isResolving}
                      onClick={() => onApprove(request.approvalRequestId)}
                      style={actionButtonStyle("#0f766e")}
                      type="button"
                    >
                      Approve
                    </button>
                    <button
                      disabled={isResolving}
                      onClick={() => onReject(request.approvalRequestId)}
                      style={actionButtonStyle("#b91c1c")}
                      type="button"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <p style={{ color: "#cbd5e1", margin: "0.95rem 0 0" }}>
                    Decision: {request.decision}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function actionButtonStyle(background: string): CSSProperties {
  return {
    background,
    border: "none",
    borderRadius: "999px",
    color: "#f8fafc",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 700,
    padding: "0.6rem 1rem",
  };
}
