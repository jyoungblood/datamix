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
  activePageCanvas?: "muted" | "sidebar";
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

const LOADER_VIEW_TRANSITIONS_ENABLED = false;

export function LoaderViewTransitionBoundary({
  active,
  activePageCanvas = "sidebar",
  children,
  ...props
}: LoaderViewTransitionBoundaryProps) {
  if (!LOADER_VIEW_TRANSITIONS_ENABLED) {
    return (
      <div
        className="datamix-loader-transition-surface"
        data-page-canvas={active ? activePageCanvas : undefined}
      >
        {children}
      </div>
    );
  }

  return (
    <EnabledLoaderViewTransitionBoundary
      active={active}
      activePageCanvas={activePageCanvas}
      {...props}
    >
      {children}
    </EnabledLoaderViewTransitionBoundary>
  );
}

function EnabledLoaderViewTransitionBoundary({
  active,
  activePageCanvas = "sidebar",
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
    <div
      className="datamix-loader-transition-surface"
      data-page-canvas={renderLoader ? activePageCanvas : undefined}
    >
      {renderLoader ? fallback : children}
    </div>
  );
}
