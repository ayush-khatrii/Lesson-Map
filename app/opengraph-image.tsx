import { ImageResponse } from "next/og";

export const alt = "LessonMap — Visual course planning for creators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          color: "white",
          background:
            "radial-gradient(circle at 80% 10%, #5865f2 0, transparent 36%), linear-gradient(135deg, #080b14 0%, #11162a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: 34, fontWeight: 700 }}>
          <div style={{ display: "flex", width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", background: "#6475ff" }}>L</div>
          LessonMap
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: 900 }}>
          <div style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 750, letterSpacing: "-3px" }}>
            Plan courses clearly. Share them beautifully.
          </div>
          <div style={{ fontSize: 29, color: "#c8cde2", lineHeight: 1.35 }}>
            Organize modules, lessons, and resources in one visual course workspace.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
