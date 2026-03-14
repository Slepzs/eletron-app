import type { DomainEvent } from "@iamrobot/protocol";

import { describeDomainEvent, formatTimestamp } from "./runtime-formatting";
import { SectionCard } from "./section-card";

export interface EventTimelineCardProps {
  readonly events: readonly DomainEvent[];
}

function getEventDotColor(eventType: string): string {
  if (eventType.includes("error") || eventType.includes("failed") || eventType.includes("failure")) {
    return "#f87171";
  }
  return "#38bdf8";
}

export function EventTimelineCard({ events }: EventTimelineCardProps) {
  return (
    <SectionCard eyebrow="Timeline" title="Run events">
      {events.length === 0 ? (
        <p style={{ color: "#94a3b8", margin: 0 }}>The event log is empty for this run.</p>
      ) : (
        <div>
          {events.map((event, index) => {
            const description = describeDomainEvent(event);
            const dotColor = getEventDotColor(event.type);
            const isLast = index === events.length - 1;

            return (
              <div
                key={`${event.type}:${event.timestamp}:${index}`}
                style={{ position: "relative" }}
              >
                {!isLast && (
                  <div
                    style={{
                      background: "rgba(148, 163, 184, 0.12)",
                      bottom: "-8px",
                      left: "3px",
                      position: "absolute",
                      top: "16px",
                      width: "2px",
                    }}
                  />
                )}
                <div
                  style={{
                    alignItems: "flex-start",
                    display: "flex",
                    gap: "0.75rem",
                    padding: "0.6rem 0",
                  }}
                >
                  <div
                    style={{
                      background: dotColor,
                      borderRadius: "50%",
                      flexShrink: 0,
                      height: "8px",
                      marginTop: "4px",
                      width: "8px",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: "0.5rem",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 500,
                        }}
                      >
                        {description.title}
                      </span>
                      <span
                        style={{
                          color: "#64748b",
                          flexShrink: 0,
                          fontSize: "0.7rem",
                          marginLeft: "auto",
                        }}
                      >
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    {description.detail ? (
                      <p style={{ color: "#cbd5e1", fontSize: "0.85rem", margin: "0.2rem 0 0" }}>
                        {description.detail}
                      </p>
                    ) : null}
                    <p
                      style={{
                        color: "#64748b",
                        fontFamily: "ui-monospace, SFMono-Regular, monospace",
                        fontSize: "0.75rem",
                        margin: "0.25rem 0 0",
                      }}
                    >
                      {event.type}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
