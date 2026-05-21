"use client";

/**
 * Bắt lỗi ở root layout (ngoài `error.tsx`). Phải có `<html>` + `<body>` riêng.
 * Giữ tối giản, không phụ thuộc ThemeProvider / tailwind token để luôn render được.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#e8e6dc",
          fontFamily: "system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>WanderTale</h1>
          <p style={{ marginTop: 12, fontSize: "0.875rem", opacity: 0.85, wordBreak: "break-word" }}>
            {error.message || "Something went wrong."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 24,
              borderRadius: 9999,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "#f54e00",
              color: "#fff",
              padding: "10px 20px",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
