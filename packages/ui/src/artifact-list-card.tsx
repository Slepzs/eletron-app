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
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {artifacts.map((artifact) => (
            <article
              key={artifact.artifactId}
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
                  <h3 style={{ margin: 0 }}>{artifact.label}</h3>
                  <p style={{ color: "#94a3b8", margin: "0.35rem 0 0" }}>{artifact.kind}</p>
                </div>
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                  {formatTimestamp(artifact.createdAt)}
                </span>
              </div>
              {artifact.path ? (
                <p style={{ color: "#cbd5e1", margin: "0.8rem 0 0", wordBreak: "break-all" }}>
                  {artifact.path}
                </p>
              ) : null}
              {artifact.contentType ? (
                <p style={{ color: "#64748b", margin: "0.45rem 0 0" }}>{artifact.contentType}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
