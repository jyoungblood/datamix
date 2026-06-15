import type { ReactNode } from "react";

import "../styles/globals.css";

type DatamixRootLayoutProps = {
  children: ReactNode;
};

const initialPageCanvasStyle = {
  backgroundColor: "var(--page-canvas, #080f1f)",
};

export default function DatamixRootLayout({ children }: DatamixRootLayoutProps) {
  return (
    <html lang="en" style={initialPageCanvasStyle}>
      <body style={initialPageCanvasStyle}>{children}</body>
    </html>
  );
}
