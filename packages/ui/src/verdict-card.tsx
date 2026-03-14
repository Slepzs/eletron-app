import type { Verdict } from "@iamrobot/protocol";

import { formatVerdictStatusLabel, getVerdictColor } from "./runtime-formatting";
import { SectionCard } from "./section-card";

export interface VerdictCardProps {
  readonly verdict: Verdict | undefined;
}

export function VerdictCard({ verdict }: VerdictCardProps) {
  return (
    <SectionCard eyebrow="Verdict" title="Outcome">
      {verdict ? (
        <div style={{ display: "grid", gap: "0.95rem" }}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "space-between",
            }}
          >
            <p style={{ color: "#cbd5e1", margin: 0 }}>{verdict.summary}</p>
            <span
              style={{
                border: `1px solid ${getVerdictColor(verdict.status)}`,
                borderRadius: "999px",
                color: getVerdictColor(verdict.status),
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                padding: "0.3rem 0.65rem",
                textTransform: "uppercase",
              }}
            >
              {formatVerdictStatusLabel(verdict.status)}
            </span>
          </div>
          <div>
            <h3
              style={{
                color: "#cbd5e1",
                fontSize: "0.8rem",
                letterSpacing: "0.08em",
                margin: "0 0 0.65rem",
                textTransform: "uppercase",
              }}
            >
              Blocking Issues
            </h3>
            {verdict.blockingIssues.length === 0 ? (
              <p style={{ color: "#94a3b8", margin: 0 }}>No blocking issues recorded.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {verdict.blockingIssues.map((issue) => (
                  <li key={issue} style={{ lineHeight: 1.6 }}>
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <dl style={{ display: "grid", gap: "0.5rem", margin: 0 }}>
            <div>
              <dt style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Next action</dt>
              <dd style={{ margin: "0.2rem 0 0" }}>
                {verdict.proposedNextAction ?? "No follow-up action recorded."}
              </dd>
            </div>
            <div>
              <dt style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Confidence</dt>
              <dd style={{ margin: "0.2rem 0 0" }}>{Math.round(verdict.confidence * 100)}%</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p style={{ color: "#94a3b8", margin: 0 }}>
          No verdict has been recorded for this run yet.
        </p>
      )}
    </SectionCard>
  );
}
