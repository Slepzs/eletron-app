import type { DomainEvent } from "@iamrobot/protocol";

import { describeDomainEvent, formatTimestamp } from "./runtime-formatting";
import { SectionCard } from "./section-card";

export interface EventTimelineCardProps {
  readonly events: readonly DomainEvent[];
}

export function EventTimelineCard({ events }: EventTimelineCardProps) {
  return (
    <SectionCard eyebrow="Timeline" title="Run events">
      {events.length === 0 ? (
        <p style={{ color: "#94a3b8", margin: 0 }}>The event log is empty for this run.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {events.map((event, index) => {
            const description = describeDomainEvent(event);

            return (
              <article
                key={`${event.type}:${event.timestamp}:${index}`}
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
                  <h3 style={{ margin: 0 }}>{description.title}</h3>
                  <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
                <p style={{ color: "#cbd5e1", margin: "0.4rem 0 0" }}>{description.detail}</p>
                <p
                  style={{
                    color: "#64748b",
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: "0.75rem",
                    margin: "0.55rem 0 0",
                  }}
                >
                  {event.type}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
