import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          color: "white",
          background: "linear-gradient(135deg, #7582ff, #4a55d8)",
          fontSize: 108,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        L
      </div>
    ),
    size,
  );
}
