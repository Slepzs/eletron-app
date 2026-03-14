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
        background: "rgba(8, 15, 28, 0.75)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        borderRadius: "20px",
        boxShadow: "0 16px 48px rgba(2, 6, 23, 0.32)",
        color: "#e2e8f0",
        padding: "1.25rem",
      }}
    >
      <header
        style={{
          alignItems: "center",
          borderBottom: "1px solid rgba(148, 163, 184, 0.10)",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "1rem",
          paddingBottom: "0.85rem",
        }}
      >
        <div>
          <p
            style={{
              color: "#93c5fd",
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </p>
          <h2
            style={{
              fontSize: "1.05rem",
              fontWeight: 600,
              margin: "0.3rem 0 0",
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
