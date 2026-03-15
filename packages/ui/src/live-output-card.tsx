import type { AgentOutputChannel, AgentOutputChunk, AgentSession } from "@iamrobot/protocol";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { formatAgentKindLabel, formatAgentRoleLabel, formatTimestamp } from "./runtime-formatting";
import { SectionCard } from "./section-card";

type SessionFilter = AgentSession["sessionId"] | "all";
type ChannelFilter = AgentOutputChannel | "all";

export interface LiveOutputCardProps {
  readonly entries: readonly AgentOutputChunk[];
  readonly error?: string | null;
  readonly sessions: readonly AgentSession[];
}

export function LiveOutputCard({ entries, error = null, sessions }: LiveOutputCardProps) {
  const [autoFollow, setAutoFollow] = useState(true);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastEntryCountRef = useRef(0);

  useEffect(() => {
    if (sessionFilter === "all") {
      return;
    }

    if (sessions.some((session) => session.sessionId === sessionFilter)) {
      return;
    }

    setSessionFilter("all");
  }, [sessionFilter, sessions]);

  const visibleEntries = entries.filter((entry) => {
    if (channelFilter !== "all" && entry.type !== channelFilter) {
      return false;
    }

    if (sessionFilter !== "all" && entry.sessionId !== sessionFilter) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    if (!autoFollow) {
      return;
    }

    if (visibleEntries.length === lastEntryCountRef.current) {
      return;
    }

    lastEntryCountRef.current = visibleEntries.length;
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [autoFollow, visibleEntries.length]);

  const runningSessionCount = sessions.filter((session) => session.status === "running").length;

  return (
    <SectionCard
      eyebrow="Terminal"
      title="Live output"
      aside={
        <div style={{ alignItems: "center", display: "flex", gap: "0.6rem" }}>
          <span style={liveStatusStyle(runningSessionCount > 0)}>
            {runningSessionCount > 0 ? "Streaming" : "Idle"}
          </span>
          <button
            onClick={() => setAutoFollow((current) => !current)}
            style={filterButtonStyle(autoFollow)}
            type="button"
          >
            {autoFollow ? "Following" : "Paused"}
          </button>
        </div>
      }
    >
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "grid", gap: "0.55rem" }}>
          <FilterGroup
            activeValue={sessionFilter}
            items={[
              { label: "All sessions", value: "all" },
              ...sessions.map((session) => ({
                label: `${formatAgentKindLabel(session.adapter)} ${formatAgentRoleLabel(session.role)}`,
                value: session.sessionId,
              })),
            ]}
            label="Session"
            onSelect={(value) => setSessionFilter(value as SessionFilter)}
          />
          <FilterGroup
            activeValue={channelFilter}
            items={[
              { label: "All channels", value: "all" },
              { label: "Stdout", value: "stdout" },
              { label: "Stderr", value: "stderr" },
            ]}
            label="Channel"
            onSelect={(value) => setChannelFilter(value as ChannelFilter)}
          />
        </div>

        {error ? <p style={{ color: "#fca5a5", margin: 0 }}>{error}</p> : null}

        <div ref={scrollContainerRef} style={terminalViewportStyle}>
          {visibleEntries.length === 0 ? (
            <span style={emptyPromptStyle}>
              {">"} Agent stdout and stderr will stream here while the run is active.
            </span>
          ) : (
            visibleEntries.map((entry, index) => {
              const session = sessions.find((candidate) => candidate.sessionId === entry.sessionId);
              const sessionLabel = session
                ? `${formatAgentKindLabel(session.adapter)}/${formatAgentRoleLabel(session.role)}`
                : entry.sessionId.slice(-8);

              return (
                <TerminalChunk
                  key={`${entry.sessionId}:${entry.timestamp}:${index}`}
                  channel={entry.type}
                  content={entry.content}
                  sessionLabel={sessionLabel}
                  timestamp={entry.timestamp}
                />
              );
            })
          )}
        </div>
      </div>
    </SectionCard>
  );
}

interface TerminalChunkProps {
  readonly channel: AgentOutputChannel;
  readonly content: string;
  readonly sessionLabel: string;
  readonly timestamp: string;
}

function TerminalChunk({ channel, content, sessionLabel, timestamp }: TerminalChunkProps) {
  const isStderr = channel === "stderr";

  return (
    <div style={chunkRowStyle(isStderr)}>
      <div style={chunkMetaStyle}>
        <span style={timestampStyle}>{formatTimestamp(timestamp)}</span>
        <span style={sessionLabelStyle(isStderr)}>{sessionLabel}</span>
        <span style={channelPillStyle(isStderr)}>{channel}</span>
      </div>
      <pre style={chunkContentStyle(isStderr)}>{content}</pre>
    </div>
  );
}

interface FilterGroupProps {
  readonly activeValue: string;
  readonly items: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly label: string;
  readonly onSelect: (value: string) => void;
}

function FilterGroup({ activeValue, items, label, onSelect }: FilterGroupProps) {
  return (
    <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
      <span style={{ color: "#475569", fontSize: "0.7rem", flexShrink: 0 }}>{label}:</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {items.map((item) => (
          <button
            key={item.value}
            onClick={() => onSelect(item.value)}
            style={filterButtonStyle(activeValue === item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function chunkRowStyle(isStderr: boolean): CSSProperties {
  return {
    borderLeft: `2px solid ${isStderr ? "rgba(248, 113, 113, 0.35)" : "rgba(56, 189, 248, 0.2)"}`,
    marginBottom: "0.2rem",
    paddingLeft: "0.65rem",
  };
}

const chunkMetaStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  gap: "0.45rem",
  marginBottom: "0.15rem",
};

const timestampStyle: CSSProperties = {
  color: "#334155",
  fontFamily: '"SFMono-Regular", "Menlo", monospace',
  fontSize: "0.65rem",
};

function sessionLabelStyle(isStderr: boolean): CSSProperties {
  return {
    color: isStderr ? "#fca5a5" : "#7dd3fc",
    fontFamily: '"SFMono-Regular", "Menlo", monospace',
    fontSize: "0.67rem",
    fontWeight: 600,
    opacity: 0.75,
  };
}

function channelPillStyle(isStderr: boolean): CSSProperties {
  return {
    background: isStderr ? "rgba(239, 68, 68, 0.1)" : "rgba(56, 189, 248, 0.1)",
    borderRadius: "999px",
    color: isStderr ? "#fca5a5" : "#7dd3fc",
    fontSize: "0.6rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "0.1rem 0.4rem",
    textTransform: "uppercase",
  };
}

function chunkContentStyle(isStderr: boolean): CSSProperties {
  return {
    color: isStderr ? "#fecaca" : "#dbeafe",
    fontFamily: '"SFMono-Regular", "Menlo", "Monaco", monospace',
    fontSize: "0.79rem",
    lineHeight: 1.55,
    margin: 0,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
  };
}

function filterButtonStyle(active: boolean): CSSProperties {
  return {
    background: active ? "rgba(56, 189, 248, 0.16)" : "rgba(15, 23, 42, 0.7)",
    border: active ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: "999px",
    color: active ? "#e0f2fe" : "#94a3b8",
    cursor: "pointer",
    fontSize: "0.7rem",
    fontWeight: 600,
    padding: "0.25rem 0.6rem",
  };
}

function liveStatusStyle(isStreaming: boolean): CSSProperties {
  return {
    color: isStreaming ? "#4ade80" : "#94a3b8",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };
}

const terminalViewportStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(2, 6, 23, 0.97) 0%, rgba(6, 12, 28, 0.97) 100%)",
  border: "1px solid rgba(56, 189, 248, 0.1)",
  borderRadius: "14px",
  boxShadow: "inset 0 1px 0 rgba(148, 163, 184, 0.04)",
  maxHeight: "480px",
  minHeight: "200px",
  overflow: "auto",
  padding: "0.85rem 1rem",
};

const emptyPromptStyle: CSSProperties = {
  color: "#334155",
  fontFamily: '"SFMono-Regular", "Menlo", monospace',
  fontSize: "0.79rem",
};
