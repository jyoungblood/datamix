import * as React from "react";

import { cn } from "@/lib/utils";

type AdminSkeletonProps = React.ComponentPropsWithoutRef<"div">;

type AdminTableSkeletonProps = AdminSkeletonProps & {
  columns?: number;
  rows?: number;
};

type AdminMiniListSkeletonProps = AdminSkeletonProps & {
  rows?: number;
};

function AdminSkeletonBlock({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-pulse rounded-md bg-slate-200/80",
        className,
      )}
      {...props}
    />
  );
}

function AdminTableSkeleton({
  className,
  columns = 5,
  rows = 4,
  ...props
}: AdminTableSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("divide-y divide-border", className)}
      {...props}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          className="grid gap-3 px-4 py-3"
          key={rowIndex}
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <AdminSkeletonBlock
              className={cn(
                "h-3",
                columnIndex === 0
                  ? "w-4/5"
                  : columnIndex === columns - 1
                    ? "w-3/5"
                    : "w-2/3",
              )}
              key={columnIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function AdminMiniListSkeleton({
  className,
  rows = 4,
  ...props
}: AdminMiniListSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("grid gap-3", className)}
      {...props}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          className="rounded-lg border border-border bg-white px-4 py-3"
          key={rowIndex}
        >
          <AdminSkeletonBlock className="h-4 w-1/2" />
          <AdminSkeletonBlock className="mt-2 h-3 w-4/5" />
          <AdminSkeletonBlock className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function AdminDetailListSkeleton({ className, ...props }: AdminSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("grid grid-cols-2 gap-y-3 text-[11px]", className)}
      {...props}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <React.Fragment key={index}>
          <AdminSkeletonBlock className="h-3 w-24" />
          <AdminSkeletonBlock className="h-3 w-4/5" />
        </React.Fragment>
      ))}
    </div>
  );
}

function AdminDetailPanelSkeleton({ className, ...props }: AdminSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("grid gap-3", className)}
      {...props}
    >
      <AdminSkeletonBlock className="h-3 w-24" />
      <AdminSkeletonBlock className="h-5 w-3/5" />
      <AdminSkeletonBlock className="h-3 w-4/5" />
      <AdminDetailListSkeleton className="mt-2" />
    </div>
  );
}

export {
  AdminDetailListSkeleton,
  AdminDetailPanelSkeleton,
  AdminMiniListSkeleton,
  AdminTableSkeleton,
};
