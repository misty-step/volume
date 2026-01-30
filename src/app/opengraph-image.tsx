import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  // Note: Satori (ImageResponse) doesn't support woff2, must use TTF
  // Bebas Neue v16 (latin) - for display title
  const bebasNeueData = await fetch(
    "https://fonts.gstatic.com/s/bebasneue/v16/JTUSjIg69CK48gW7PXoo9Wlhzg.ttf"
  ).then((response) => response.arrayBuffer());
  // Inter v20 (latin, wght@500) - for tagline
  const interData = await fetch(
    "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf"
  ).then((response) => response.arrayBuffer());

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#faf8f5",
        color: "#0a0a0a",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 12,
            padding: 8,
          }}
        >
          <div
            style={{
              width: 36,
              height: 60,
              background: "hsl(0, 0%, 0%)",
              borderRadius: 9,
            }}
          />
          <div
            style={{
              width: 36,
              height: 108,
              background: "hsl(0, 0%, 0%)",
              borderRadius: 9,
            }}
          />
          <div
            style={{
              width: 36,
              height: 156,
              background: "hsl(0, 0%, 0%)",
              borderRadius: 9,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            lineHeight: 1,
          }}
        >
          <div
            style={{
              fontFamily:
                '"Bebas Neue", "Oswald", "Impact", "Arial Narrow", sans-serif',
              fontSize: 168,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Volume
          </div>
          <div
            style={{
              fontFamily:
                '"Inter", "Helvetica Neue", "Helvetica", "Arial", sans-serif',
              fontSize: 44,
              fontWeight: 500,
              letterSpacing: 0.5,
            }}
          >
            Simple workout tracking
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Bebas Neue",
          data: bebasNeueData,
          weight: 400,
          style: "normal",
        },
        {
          name: "Inter",
          data: interData,
          weight: 500,
          style: "normal",
        },
      ],
    }
  );
}
