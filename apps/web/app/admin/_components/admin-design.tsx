import * as React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type AdminPageHeaderProps = Omit<
  React.ComponentPropsWithoutRef<"header">,
  "title"
> & {
  action?: React.ReactNode
  description?: React.ReactNode
  eyebrow?: React.ReactNode
  title: React.ReactNode
}

function AdminPageHeader({
  action,
  className,
  description,
  eyebrow,
  title,
  ...props
}: AdminPageHeaderProps) {
  return (
    <header
      className={cn("mb-4 flex items-start justify-between gap-4", className)}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="font-data text-[10px] font-extrabold tracking-wide text-slate-400 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-[28px] leading-tight font-extrabold text-slate-950">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

type AdminMetricProps = React.ComponentPropsWithoutRef<"div"> & {
  description?: React.ReactNode
  label: React.ReactNode
  value: React.ReactNode
}

function AdminMetric({
  className,
  description,
  label,
  value,
  ...props
}: AdminMetricProps) {
  return (
    <Card
      className={cn("rounded-lg border-border bg-white shadow-none", className)}
      {...props}
    >
      <CardContent className="p-4">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="mt-1 font-data text-2xl text-slate-950">{value}</p>
        {description ? (
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            {description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

type AdminFieldProps = React.ComponentPropsWithoutRef<typeof Input> & {
  hint?: React.ReactNode
  inputClassName?: string
  label: React.ReactNode
}

function AdminField({
  "aria-describedby": ariaDescribedBy,
  className,
  hint,
  id,
  inputClassName,
  label,
  ...props
}: AdminFieldProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const describedBy = [ariaDescribedBy, hintId].filter(Boolean).join(" ") || undefined

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        aria-describedby={describedBy}
        className={cn("bg-white", inputClassName)}
        id={inputId}
        {...props}
      />
      {hint ? (
        <p className="text-xs leading-5 text-muted-foreground" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type AdminSectionCardProps = Omit<
  React.ComponentPropsWithoutRef<typeof Card>,
  "title"
> & {
  action?: React.ReactNode
  description?: React.ReactNode
  title?: React.ReactNode
}

function AdminSectionCard({
  action,
  children,
  className,
  description,
  title,
  ...props
}: AdminSectionCardProps) {
  const hasHeader = title || description || action

  return (
    <Card
      className={cn("rounded-lg border-border bg-white shadow-none", className)}
      {...props}
    >
      {hasHeader ? (
        <CardHeader className="gap-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? (
                <CardTitle className="text-lg text-slate-950">
                  {title}
                </CardTitle>
              ) : null}
              {description ? (
                <CardDescription className="mt-1 text-xs leading-5">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={hasHeader ? undefined : "pt-6"}>
        {children}
      </CardContent>
    </Card>
  )
}

type AdminDetailListItem = {
  code?: boolean
  label: React.ReactNode
  value: React.ReactNode
}

type AdminDetailListProps = React.ComponentPropsWithoutRef<"dl"> & {
  items: AdminDetailListItem[]
}

function AdminDetailList({
  className,
  items,
  ...props
}: AdminDetailListProps) {
  return (
    <dl className={cn("grid grid-cols-2 gap-y-2 text-[11px]", className)} {...props}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <dt className="font-bold text-slate-500">{item.label}</dt>
          <dd
            className={cn(
              "m-0 min-w-0 text-slate-950",
              item.code && "font-data break-words text-slate-500"
            )}
          >
            {item.value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  )
}

export {
  AdminPageHeader,
  AdminMetric,
  AdminField,
  AdminSectionCard,
  AdminDetailList,
}
export type {
  AdminPageHeaderProps,
  AdminMetricProps,
  AdminFieldProps,
  AdminSectionCardProps,
  AdminDetailListItem,
  AdminDetailListProps,
}
