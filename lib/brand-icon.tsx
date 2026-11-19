import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function renderBrandIcon(size: number) {
  const logo = await readFile(join(process.cwd(), "public/logo-2.png"));
  const source = `data:image/png;base64,${logo.toString("base64")}`;
  // The source has generous transparent padding. Enlarge the mark so it stays
  // recognizable at browser-tab sizes, with a dark tile for yellow contrast.
  const logoSize = Math.round(size * 1.28);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#171717",
        overflow: "hidden",
        borderRadius: size * 0.2,
      }}
    >
      <img
        src={source}
        alt=""
        width={logoSize}
        height={logoSize}
        style={{ flexShrink: 0 }}
      />
    </div>,
    { width: size, height: size },
  );
}
