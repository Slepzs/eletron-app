import type { PropsWithChildren, ReactNode } from "react";

export interface SectionCardProps extends PropsWithChildren {
  readonly eyebrow: string;
  readonly title: string;
  readonly aside?: ReactNode;
}

export function SectionCard({ aside, children, eyebrow, title }: SectionCardProps) {
  return (
    <section
      style={{
        background: "rgba(10, 16, 24, 0.9)",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        borderRadius: "20px",
        boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
        color: "#e2e8f0",
        padding: "1.5rem",
      }}
    >
      <header
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div>
          <p
            style={{
              color: "#93c5fd",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </p>
          <h2
            style={{
              fontSize: "1.2rem",
              margin: "0.35rem 0 0",
            }}
          >
            {title}
          </h2>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}
