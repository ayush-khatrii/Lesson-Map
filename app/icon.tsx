import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          color: "white",
          background: "linear-gradient(135deg, #7582ff, #4a55d8)",
          fontSize: 38,
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
