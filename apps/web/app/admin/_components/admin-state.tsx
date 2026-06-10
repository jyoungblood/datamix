import * as React from "react"

import { cn } from "@/lib/utils"

type AdminStateBoxTone = "error" | "neutral" | "success" | "warning"

type AdminStateBoxProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "role"
> & {
  actionLabel?: string
  body: string
  compact?: boolean
  onAction?: () => void
  onSecondaryAction?: () => void
  secondaryActionLabel?: string
  title: string
  tone?: AdminStateBoxTone
}

function AdminStateBox({
  actionLabel,
  body,
  className,
  compact = false,
  onAction,
  onSecondaryAction,
  secondaryActionLabel,
  title,
  tone = "neutral",
  ...props
}: AdminStateBoxProps) {
  return (
    <div
      className={cn(
        "empty-state-box state-box",
        `state-box-${tone}`,
        compact && "compact-box",
        className
      )}
      role={tone === "error" ? "alert" : "status"}
      {...props}
    >
      <p className="list-title">{title}</p>
      <p className="list-copy">{body}</p>
      {actionLabel || secondaryActionLabel ? (
        <div className="actions actions-compact state-box-actions">
          {actionLabel ? (
            <button className="mini-button" onClick={onAction} type="button">
              {actionLabel}
            </button>
          ) : null}
          {secondaryActionLabel ? (
            <button
              className="mini-button"
              onClick={onSecondaryAction}
              type="button"
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export { AdminStateBox }
export type { AdminStateBoxProps, AdminStateBoxTone }
