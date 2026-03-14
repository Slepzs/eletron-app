import type { AgentSession } from "@iamrobot/protocol";

import {
  formatAgentKindLabel,
  formatAgentRoleLabel,
  formatSessionStatusLabel,
  formatTimestamp,
  getSessionStatusColor,
} from "./runtime-formatting";
import { SectionCard } from "./section-card";

export interface SessionListCardProps {
  readonly sessions: readonly AgentSession[];
}

export function SessionListCard({ sessions }: SessionListCardProps) {
  return (
    <SectionCard eyebrow="Sessions" title="Agent activity">
      {sessions.length === 0 ? (
        <p style={{ color: "#94a3b8", margin: 0 }}>No sessions have started for this run yet.</p>
      ) : (
        <div>
          {sessions.map((session, index) => (
            <div
              key={session.sessionId}
              style={{
                borderBottom:
                  index === sessions.length - 1
                    ? undefined
                    : "1px solid rgba(148, 163, 184, 0.08)",
                padding: "0.75rem 0",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                    {formatAgentKindLabel(session.adapter)}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                    {formatAgentRoleLabel(session.role)}
                  </div>
                </div>
                <span
                  style={{
                    border: `1px solid ${getSessionStatusColor(session.status)}`,
                    borderRadius: "999px",
                    color: getSessionStatusColor(session.status),
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    padding: "0.3rem 0.65rem",
                    textTransform: "uppercase",
                  }}
                >
                  {formatSessionStatusLabel(session.status)}
                </span>
              </div>
              <dl
                style={{
                  display: "grid",
                  gap: "0.5rem",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  margin: "0.6rem 0 0",
                }}
              >
                <SessionField label="Started" value={formatTimestamp(session.startedAt)} />
                <SessionField label="Ended" value={formatTimestamp(session.endedAt)} />
              </dl>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

interface SessionFieldProps {
  readonly label: string;
  readonly value: string;
}

function SessionField({ label, value }: SessionFieldProps) {
  return (
    <div>
      <dt style={{ color: "#64748b", fontSize: "0.72rem" }}>{label}</dt>
      <dd style={{ color: "#64748b", fontSize: "0.75rem", margin: "0.2rem 0 0" }}>{value}</dd>
    </div>
  );
}
