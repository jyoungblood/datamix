"use client"

import * as React from "react"
import Link from "next/link"
import {
  Blocks,
  Database,
  FileText,
  Image,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { AdminWorkspaceRouteSection } from "../_workspace/admin-routes"

type DatamixSidebarItem = {
  activeIds?: string[]
  href?: string
  icon: LucideIcon
  id: string
  label: string
  prefetch?: boolean
  section?: AdminWorkspaceRouteSection
}

type DatamixSidebarPrefetchItem = Pick<
  DatamixSidebarItem,
  "href" | "id" | "label" | "prefetch" | "section"
>

const defaultDatamixSidebarItems: DatamixSidebarItem[] = [
  { id: "schema", label: "Schema", icon: Database, activeIds: ["schema-builder"] },
  { id: "content", label: "Content", icon: FileText },
  { id: "media", label: "Media", icon: Image },
  { id: "team", label: "Team", icon: Users },
  { id: "settings", label: "Settings", icon: SlidersHorizontal },
]

type DatamixSidebarAccount = {
  avatarSrc?: string
  emailRole?: string
  href?: string
  initials?: string
  name?: string
  prefetch?: boolean
  section?: AdminWorkspaceRouteSection
}

type DatamixSidebarProps = Omit<
  React.ComponentPropsWithoutRef<"aside">,
  "children"
> & {
  account?: DatamixSidebarAccount
  activeItem?: string
  brandHref?: string
  brandLabel?: string
  brandRoute?: DatamixSidebarPrefetchItem
  items?: DatamixSidebarItem[]
  onAccountClick?: () => void
  onBrandClick?: () => void
  onNavigate?: (item: DatamixSidebarItem) => void
  onPrefetch?: (item: DatamixSidebarPrefetchItem) => void
}

function DatamixSidebar({
  account = {
    emailRole: "Admin",
    initials: "DM",
    name: "Datamix Admin",
  },
  activeItem = "schema",
  brandHref,
  brandLabel = "DATAMIX",
  brandRoute,
  className,
  items = defaultDatamixSidebarItems,
  onAccountClick,
  onBrandClick,
  onNavigate,
  onPrefetch,
  ...props
}: DatamixSidebarProps) {
  const resolvedBrandHref = brandRoute?.href ?? brandHref
  const prefetchBrandRoute = () => {
    if (brandRoute) {
      onPrefetch?.(brandRoute)
    }
  }
  const prefetchAccountRoute = () => {
    if (account.href && account.section) {
      onPrefetch?.({
        href: account.href,
        id: "account",
        label: "Account",
        prefetch: account.prefetch ?? true,
        section: account.section,
      })
    }
  }
  const brandClassName =
    "mb-8 flex items-center gap-2.5 border-0 bg-transparent p-0 text-left text-inherit"
  const brandContent = (
    <>
      <span className="flex h-[27px] w-[27px] items-center justify-center rounded-md bg-[var(--primary)]">
        <Blocks className="h-4 w-4 text-blue-100" />
      </span>
      <span className="font-heading text-sm font-extrabold tracking-wide text-white">
        {brandLabel}
      </span>
    </>
  )
  const accountClassName =
    "mt-auto flex h-14 w-full shrink-0 items-center gap-2.5 rounded-[9px] border border-[var(--sidebar-border)] bg-[var(--sidebar-accent)] px-2.5 text-left"
  const accountContent = (
    <>
      <Avatar className="h-[30px] w-[30px] bg-[var(--primary)]">
        {account.avatarSrc ? (
          <AvatarImage alt={account.name ?? "Admin user"} src={account.avatarSrc} />
        ) : null}
        <AvatarFallback className="bg-[var(--primary)] text-[10px] font-bold text-white">
          {account.initials ?? "DM"}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-bold text-white">
          {account.name ?? "Datamix Admin"}
        </span>
        <span className="block truncate text-[7px] text-[var(--sidebar-muted)]">
          {account.emailRole ?? "Admin"}
        </span>
      </span>
    </>
  )

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen w-[176px] shrink-0 flex-col overflow-y-auto bg-[var(--sidebar)] px-4 py-[18px] text-[var(--sidebar-foreground)]",
        className
      )}
      {...props}
    >
      {resolvedBrandHref ? (
        <Link
          className={brandClassName}
          href={resolvedBrandHref}
          onClick={() => onBrandClick?.()}
          onFocus={prefetchBrandRoute}
          onMouseEnter={prefetchBrandRoute}
          prefetch={brandRoute?.prefetch ?? true}
        >
          {brandContent}
        </Link>
      ) : onBrandClick ? (
        <button className={brandClassName} onClick={onBrandClick} type="button">
          {brandContent}
        </button>
      ) : (
        <div className={brandClassName}>{brandContent}</div>
      )}

      <nav className="space-y-3" aria-label="Admin">
        {items.map((item) => {
          const isActive =
            activeItem === item.id || item.activeIds?.includes(activeItem)
          const isInteractive = Boolean(item.href || onNavigate)
          const Icon = item.icon
          const navClassName = cn(
            "flex h-[34px] w-full items-center gap-2.5 rounded-[7px] px-2.5 text-left text-xs transition",
            isActive
              ? "border border-[var(--sidebar-border)] bg-[var(--sidebar-accent)] font-bold text-white"
              : "border border-transparent text-[var(--sidebar-foreground)]",
            isInteractive && !isActive && "hover:bg-[var(--sidebar-accent)]"
          )
          const navContent = (
            <>
              <Icon
                className={cn(
                  "h-[15px] w-[15px]",
                  isActive ? "text-blue-400" : "text-[var(--sidebar-muted)]"
                )}
              />
              <span>{item.label}</span>
            </>
          )

          if (item.href) {
            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={navClassName}
                href={item.href}
                key={item.id}
                onClick={() => onNavigate?.(item)}
                onFocus={() => onPrefetch?.(item)}
                onMouseEnter={() => onPrefetch?.(item)}
                prefetch={item.prefetch ?? true}
              >
                {navContent}
              </Link>
            )
          }

          if (onNavigate) {
            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={navClassName}
                key={item.id}
                onClick={() => onNavigate(item)}
                type="button"
              >
                {navContent}
              </button>
            )
          }

          return (
            <div
              aria-current={isActive ? "page" : undefined}
              className={navClassName}
              key={item.id}
            >
              {navContent}
            </div>
          )
        })}
      </nav>

      {account.href ? (
        <Link
          className={accountClassName}
          href={account.href}
          onFocus={prefetchAccountRoute}
          onMouseEnter={prefetchAccountRoute}
          prefetch={account.prefetch ?? true}
        >
          {accountContent}
        </Link>
      ) : onAccountClick ? (
        <button
          className={accountClassName}
          onClick={onAccountClick}
          type="button"
        >
          {accountContent}
        </button>
      ) : (
        <div className={accountClassName}>{accountContent}</div>
      )}
    </aside>
  )
}

type AdminFrameProps = React.ComponentPropsWithoutRef<"div"> & {
  mainClassName?: string
  sidebar?: React.ReactNode
}

function AdminFrame({
  children,
  className,
  mainClassName,
  sidebar,
  ...props
}: AdminFrameProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen bg-[var(--background)] font-body text-[var(--foreground)]",
        className
      )}
      data-page-canvas="muted"
      {...props}
    >
      {sidebar ?? <DatamixSidebar />}
      <main className={cn("flex-1 bg-[var(--muted)] p-6", mainClassName)}>
        {children}
      </main>
    </div>
  )
}

export { DatamixSidebar, AdminFrame, defaultDatamixSidebarItems }
export type { DatamixSidebarItem, DatamixSidebarAccount, DatamixSidebarProps, AdminFrameProps }
