import type { RuntimeRunDetails, Verdict } from "@iamrobot/protocol";

import { buildDiagnosticsReport } from "./diagnostics-report";
import { formatVerdictStatusLabel, getVerdictColor } from "./runtime-formatting";
import { SectionCard } from "./section-card";

export interface VerdictCardProps {
  readonly verdict: Verdict | undefined;
  readonly details?: RuntimeRunDetails;
}

export function VerdictCard({ verdict, details }: VerdictCardProps) {
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
            <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
              {verdict.summary}
            </p>
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
          {verdict.failureContext !== undefined && details !== undefined ? (
            <details
              style={{ borderTop: "1px solid rgba(148,163,184,0.1)", paddingTop: "0.75rem" }}
            >
              <summary
                style={{
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  userSelect: "none",
                }}
              >
                Failure Details
              </summary>
              <dl
                style={{
                  display: "grid",
                  gap: "0.35rem",
                  margin: "0.75rem 0 0",
                }}
              >
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <dt style={{ color: "#94a3b8", fontSize: "0.78rem", minWidth: "6rem" }}>
                    Exit code
                  </dt>
                  <dd style={{ fontFamily: "monospace", fontSize: "0.82rem", margin: 0 }}>
                    {verdict.failureContext.exitCode ?? "—"}
                  </dd>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <dt style={{ color: "#94a3b8", fontSize: "0.78rem", minWidth: "6rem" }}>
                    Signal
                  </dt>
                  <dd style={{ fontFamily: "monospace", fontSize: "0.82rem", margin: 0 }}>
                    {verdict.failureContext.signal ?? "—"}
                  </dd>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <dt style={{ color: "#94a3b8", fontSize: "0.78rem", minWidth: "6rem" }}>Stage</dt>
                  <dd style={{ fontFamily: "monospace", fontSize: "0.82rem", margin: 0 }}>
                    {verdict.failureContext.stage}
                  </dd>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <dt style={{ color: "#94a3b8", fontSize: "0.78rem", minWidth: "6rem" }}>Role</dt>
                  <dd style={{ fontFamily: "monospace", fontSize: "0.82rem", margin: 0 }}>
                    {verdict.failureContext.role}
                  </dd>
                </div>
              </dl>
              {verdict.failureContext.stderrSnippet !== null ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <p
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.78rem",
                      letterSpacing: "0.06em",
                      margin: "0 0 0.35rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Stderr
                  </p>
                  <pre
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: "0.4rem",
                      color: "#e2e8f0",
                      fontSize: "0.72rem",
                      lineHeight: 1.55,
                      margin: 0,
                      maxHeight: "12rem",
                      overflowY: "auto",
                      padding: "0.6rem 0.75rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {verdict.failureContext.stderrSnippet}
                  </pre>
                </div>
              ) : null}
              {verdict.failureContext.stackTrace !== null ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <p
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.78rem",
                      letterSpacing: "0.06em",
                      margin: "0 0 0.35rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Stack Trace
                  </p>
                  <pre
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: "0.4rem",
                      color: "#94a3b8",
                      fontSize: "0.7rem",
                      lineHeight: 1.5,
                      margin: 0,
                      maxHeight: "10rem",
                      overflowY: "auto",
                      padding: "0.6rem 0.75rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {verdict.failureContext.stackTrace}
                  </pre>
                </div>
              ) : null}
              <button
                onClick={() => {
                  const report = buildDiagnosticsReport(details, verdict);
                  navigator.clipboard.writeText(report).catch(() => undefined);
                }}
                style={{
                  background: "rgba(148,163,184,0.08)",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "0.4rem",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  marginTop: "0.85rem",
                  padding: "0.4rem 0.85rem",
                }}
                type="button"
              >
                Copy diagnostics for AI
              </button>
            </details>
          ) : null}
        </div>
      ) : (
        <p style={{ color: "#475569", fontSize: "0.82rem", margin: 0 }}>—</p>
      )}
    </SectionCard>
  );
}
