import { TaskSummaryCard } from "@iamrobot/ui";

const seedState = window.iamRobot.getSeedState();

export function App() {
  return (
    <main
      style={{
        background:
          "radial-gradient(circle at top, rgba(14, 165, 233, 0.18), transparent 45%), #020617",
        color: "#e2e8f0",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        minHeight: "100vh",
        padding: "3rem",
      }}
    >
      <div
        style={{
          margin: "0 auto",
          maxWidth: "1100px",
        }}
      >
        <p
          style={{
            color: "#38bdf8",
            fontSize: "0.8rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          IAM Robot
        </p>
        <h1
          style={{
            fontSize: "clamp(2.2rem, 4vw, 4rem)",
            lineHeight: 1,
            margin: "0.75rem 0 1rem",
            maxWidth: "14ch",
          }}
        >
          Desktop orchestration for Codex and Claude Code.
        </h1>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "1rem",
            lineHeight: 1.6,
            margin: "0 0 2rem",
            maxWidth: "70ch",
          }}
        >
          The renderer stays presentation-only. The local runtime, adapters, git worktrees,
          verification, and persistence live in separate packages so the desktop shell remains thin.
        </p>
        <TaskSummaryCard run={seedState.run} task={seedState.task} />
        <section
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: "1rem",
          }}
        >
          {seedState.agents.map((agent) => (
            <article
              key={agent.kind}
              style={{
                background: "rgba(15, 23, 42, 0.72)",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: "18px",
                padding: "1.25rem",
              }}
            >
              <h2 style={{ margin: 0, textTransform: "capitalize" }}>{agent.kind}</h2>
              <p style={{ color: "#94a3b8", margin: "0.5rem 0 0" }}>
                Adapter package wired into the monorepo and ready for runtime implementation.
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
