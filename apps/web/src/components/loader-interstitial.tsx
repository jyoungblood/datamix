export function LoaderInterstitial() {
  return (
    <main
      className="fixed inset-0 z-50 grid min-h-svh place-items-center bg-[var(--sidebar)]"
      data-page-canvas="sidebar"
    >
      <div aria-label="Loading" className="text-white" role="status">
        <TailSpinSpinner />
        <span className="sr-only">Loading</span>
      </div>
    </main>
  );
}

function TailSpinSpinner() {
  return (
    <svg
      aria-hidden="true"
      className="h-18 w-18"
      viewBox="0 0 38 38"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>tail-spin</title>
      <defs>
        <linearGradient
          id="tailSpinGradient"
          x1="8.042%"
          x2="65.682%"
          y1="0%"
          y2="23.865%"
        >
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="63.146%" stopColor="currentColor" stopOpacity=".631" />
          <stop offset="100%" stopColor="currentColor" />
        </linearGradient>
      </defs>
      <g fill="none" fillRule="evenodd">
        <g transform="translate(1 1)">
          <path
            d="M36 18c0-9.94-8.06-18-18-18"
            stroke="url(#tailSpinGradient)"
            strokeWidth="2"
          >
            <animateTransform
              attributeName="transform"
              dur="0.9s"
              from="0 18 18"
              repeatCount="indefinite"
              to="360 18 18"
              type="rotate"
            />
          </path>
          <circle cx="36" cy="18" fill="currentColor" r="1">
            <animateTransform
              attributeName="transform"
              dur="0.9s"
              from="0 18 18"
              repeatCount="indefinite"
              to="360 18 18"
              type="rotate"
            />
          </circle>
        </g>
      </g>
    </svg>
  );
}
