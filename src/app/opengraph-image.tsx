import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #05070F, #0B1222)",
          color: "white",
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "rgba(124, 224, 229, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 28,
            }}
          >
            V
          </div>
          <span style={{ fontSize: 28, letterSpacing: "0.08em" }}>VOLUME</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 24, opacity: 0.8 }}>
            Fast logging · Honest insights
          </p>
          <h1 style={{ fontSize: 64, lineHeight: 1.1 }}>
            Track every set. See the trend.
          </h1>
          <p style={{ fontSize: 28, opacity: 0.8 }}>
            Built for the seconds between sets. Log faster, stay consistent, and
            get weekly AI recaps that actually help.
          </p>
        </div>

        <div style={{ display: "flex", gap: 32, fontSize: 24 }}>
          <div>
            <p style={{ opacity: 0.6 }}>Workouts logged last month</p>
            <p style={{ fontSize: 42, fontWeight: 600 }}>1.2K+</p>
          </div>
          <div>
            <p style={{ opacity: 0.6 }}>Avg. setup time</p>
            <p style={{ fontSize: 42, fontWeight: 600 }}>&lt;5 sec</p>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
