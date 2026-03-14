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
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {sessions.map((session) => (
            <article
              key={session.sessionId}
              style={{
                background: "rgba(15, 23, 42, 0.5)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: "16px",
                padding: "1rem",
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
                  <h3 style={{ margin: 0 }}>{formatAgentKindLabel(session.adapter)}</h3>
                  <p style={{ color: "#94a3b8", margin: "0.35rem 0 0" }}>
                    {formatAgentRoleLabel(session.role)}
                  </p>
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
                  margin: "0.95rem 0 0",
                }}
              >
                <SessionField label="Started" value={formatTimestamp(session.startedAt)} />
                <SessionField label="Ended" value={formatTimestamp(session.endedAt)} />
              </dl>
            </article>
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
      <dd style={{ margin: "0.2rem 0 0" }}>{value}</dd>
    </div>
  );
}
