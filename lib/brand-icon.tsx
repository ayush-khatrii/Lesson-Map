import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function renderBrandIcon(size: number) {
  const logo = await readFile(join(process.cwd(), "public/lm-logo.png"));
  const source = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff", overflow: "hidden", borderRadius: size * 0.2 }}>
      <img src={source} alt="" width={size * 1.25} height={size * 1.25} style={{ flexShrink: 0 }} />
    </div>,
    { width: size, height: size },
  );
}
