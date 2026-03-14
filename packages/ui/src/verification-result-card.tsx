import type { VerificationResult } from "@iamrobot/protocol";

import { formatTimestamp, getCheckStatusColor } from "./runtime-formatting";
import { SectionCard } from "./section-card";

export interface VerificationResultCardProps {
  readonly result: VerificationResult | undefined;
}

export function VerificationResultCard({ result }: VerificationResultCardProps) {
  return (
    <SectionCard eyebrow="Verification" title="Checks">
      {result ? (
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "space-between",
            }}
          >
            <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
              Completed {formatTimestamp(result.completedAt)}
            </p>
            <span
              style={{
                border: `1px solid ${getCheckStatusColor(result.status)}`,
                borderRadius: "999px",
                color: getCheckStatusColor(result.status),
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                padding: "0.3rem 0.65rem",
                textTransform: "uppercase",
              }}
            >
              {result.status}
            </span>
          </div>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {result.checks.map((check) => (
              <article
                key={`${check.kind}:${check.command}`}
                style={{
                  background: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "16px",
                  padding: "0.95rem 1rem",
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
                  <strong>{check.kind}</strong>
                  <span
                    style={{
                      color: getCheckStatusColor(check.status),
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {check.status}
                  </span>
                </div>
                <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.6, margin: "0.45rem 0 0" }}>
                  {check.summary}
                </p>
                <code
                  style={{
                    color: "#7dd3fc",
                    display: "block",
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: "0.8rem",
                    marginTop: "0.6rem",
                  }}
                >
                  {check.command}
                </code>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ color: "#475569", fontSize: "0.82rem", margin: 0 }}>—</p>
      )}
    </SectionCard>
  );
}
