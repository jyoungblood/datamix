"use client";

import * as React from "react";
import { flushSync } from "react-dom";

import { LoaderInterstitial } from "@/components/loader-interstitial";

type BrowserViewTransition = {
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (
    updateCallback: () => Promise<void> | void,
  ) => BrowserViewTransition;
};

type LoaderViewTransitionBoundaryProps = {
  active: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function LoaderViewTransitionBoundary({
  active,
  children,
  fallback = <LoaderInterstitial />,
}: LoaderViewTransitionBoundaryProps) {
  const [renderLoader, setRenderLoader] = React.useState(active);
  const hasMountedRef = React.useRef(false);

  React.useLayoutEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      setRenderLoader(active);
      return;
    }

    if (renderLoader === active) {
      return;
    }

    const viewTransitionDocument = document as ViewTransitionDocument;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!viewTransitionDocument.startViewTransition || prefersReducedMotion) {
      setRenderLoader(active);
      return;
    }

    document.documentElement.classList.add("datamix-loader-view-transition");

    const transition = viewTransitionDocument.startViewTransition(() => {
      flushSync(() => {
        setRenderLoader(active);
      });
    });

    void transition.finished.finally(() => {
      document.documentElement.classList.remove("datamix-loader-view-transition");
    });
  }, [active, renderLoader]);

  return (
    <div className="datamix-loader-transition-surface">
      {renderLoader ? fallback : children}
    </div>
  );
}
