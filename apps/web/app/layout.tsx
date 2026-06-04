import type { ReactNode } from "react";

import "../styles/globals.css";

type DatamixRootLayoutProps = {
  children: ReactNode;
};

export default function DatamixRootLayout({ children }: DatamixRootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
