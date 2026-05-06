import type { ComponentType } from "react";

import "../styles/globals.css";

type DatamixAppProps = {
  Component: ComponentType<Record<string, unknown>>;
  pageProps: Record<string, unknown>;
};

export default function DatamixApp({ Component, pageProps }: DatamixAppProps) {
  return <Component {...pageProps} />;
}
