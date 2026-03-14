import type { Artifact } from "@iamrobot/protocol";

import { formatTimestamp } from "./runtime-formatting";
import { SectionCard } from "./section-card";

export interface ArtifactListCardProps {
  readonly artifacts: readonly Artifact[];
}

export function ArtifactListCard({ artifacts }: ArtifactListCardProps) {
  return (
    <SectionCard eyebrow="Artifacts" title="Logs and outputs">
      {artifacts.length === 0 ? (
        <p style={{ color: "#94a3b8", margin: 0 }}>No artifacts have been recorded for this run.</p>
      ) : (
        <div>
          {artifacts.map((artifact, index) => (
            <div
              key={artifact.artifactId}
              style={{
                borderBottom:
                  index === artifacts.length - 1
                    ? undefined
                    : "1px solid rgba(148, 163, 184, 0.08)",
                fontSize: "0.85rem",
                padding: "0.5rem 0",
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{artifact.label}</div>
                  {artifact.kind ? (
                    <span
                      style={{
                        background: "rgba(148, 163, 184, 0.08)",
                        borderRadius: "var(--radius-sm)",
                        color: "#64748b",
                        display: "inline-block",
                        fontSize: "0.68rem",
                        marginTop: "0.25rem",
                        padding: "0.15rem 0.4rem",
                      }}
                    >
                      {artifact.kind}
                    </span>
                  ) : null}
                  {artifact.path ? (
                    <div
                      style={{
                        color: "#93c5fd",
                        marginTop: "0.3rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {artifact.path}
                    </div>
                  ) : null}
                  {artifact.contentType ? (
                    <div style={{ color: "#64748b", marginTop: "0.2rem" }}>
                      {artifact.contentType}
                    </div>
                  ) : null}
                </div>
                <span style={{ color: "#64748b", flexShrink: 0, fontSize: "0.75rem" }}>
                  {formatTimestamp(artifact.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
