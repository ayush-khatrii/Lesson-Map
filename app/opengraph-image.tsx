import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "LessonMap — Visual course planning for creators";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/logo-2.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        color: "#171d24",
        background: "linear-gradient(135deg, #ffffff 0%, #f0edff 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginLeft: -18,
          fontSize: 46,
          fontWeight: 700,
          letterSpacing: "-1px",
        }}
      >
        <img src={logoSrc} alt="" width={144} height={144} />
        LessonMap
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "22px",
          maxWidth: 900,
        }}
      >
        <div
          style={{
            fontSize: 72,
            lineHeight: 1.04,
            fontWeight: 750,
            letterSpacing: "-3px",
          }}
        >
          Plan courses clearly. Share them beautifully.
        </div>
        <div style={{ fontSize: 29, color: "#53596b", lineHeight: 1.35 }}>
          Organize modules, lessons, and resources in one visual course
          workspace.
        </div>
      </div>
    </div>,
    size,
  );
}
