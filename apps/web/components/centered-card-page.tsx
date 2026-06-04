import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CenteredCardPageProps = {
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  label: string;
  maxWidthClassName?: string;
  title: string;
};

export function CenteredCardPage({
  children,
  className,
  description,
  label,
  maxWidthClassName = "max-w-lg",
  title,
}: CenteredCardPageProps) {
  return (
    <main className="min-h-svh bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div
        className={cn(
          "mx-auto flex min-h-[calc(100svh-4rem)] w-full items-center",
          maxWidthClassName,
        )}
      >
        <Card className={cn("w-full border border-border/70 shadow-sm", className)}>
          <CardHeader className="gap-4">
            <Badge className="w-fit" variant="outline">
              {label}
            </Badge>
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {title}
              </CardTitle>
              {description ? (
                <CardDescription className="max-w-prose text-sm leading-6">
                  {description}
                </CardDescription>
              ) : null}
            </div>
          </CardHeader>
          {children ? <CardContent className="space-y-6">{children}</CardContent> : null}
        </Card>
      </div>
    </main>
  );
}
