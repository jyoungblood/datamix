import { datamixProduct, datamixSurfaces } from "@datamix/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { adminPublicEnv } from "../lib/runtime";
import { authClient } from "../lib/auth-client";
import { useSetupStatus } from "../lib/setup";

const adminSurface = datamixSurfaces.find((surface) => surface.id === "admin");

export default function HomePage() {
  const session = authClient.useSession();
  const setupStatus = useSetupStatus();
  const setupStatusHeading =
    setupStatus.statusCode === 503
      ? "Auth config is incomplete"
      : "Setup status is temporarily unavailable";

  const authDescription = setupStatus.isPending
    ? "Checking whether this instance still needs its first admin account..."
    : setupStatus.errorMessage
      ? setupStatus.errorMessage
      : setupStatus.data?.setupRequired
        ? "No admin exists yet. This instance is ready for first-run setup."
        : session.data
          ? `Signed in as ${session.data.user.email}.`
          : "Admin account exists. Sign in to continue.";

  return (
    <main className="min-h-svh bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader className="gap-4">
            <Badge className="w-fit" variant="outline">
              Datamix Admin
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {datamixProduct.name}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 sm:text-base">
                {datamixProduct.tagline}. The admin app now starts from a quieter shadcn
                baseline so you can shape it without undoing a bunch of decorative styling.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-3">
              {setupStatus.data?.setupRequired ? (
                <Button asChild variant="outline">
                  <a href="/setup">Start first-run setup</a>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <a href="/login">{session.data ? "Switch account" : "Open login"}</a>
                </Button>
              )}
              {setupStatus.errorMessage ? (
                <Button onClick={setupStatus.reload} type="button" variant="outline">
                  Retry status
                </Button>
              ) : null}
              <Button asChild>
                <a href="/admin">Open admin dashboard</a>
              </Button>
            </div>

            <Separator />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
              <Card className="border border-border/70 shadow-none">
                <CardHeader className="gap-2">
                  <CardTitle>Authentication status</CardTitle>
                  <CardDescription className="text-sm leading-6">
                    {setupStatus.errorMessage
                      ? `${setupStatusHeading}. ${authDescription}`
                      : authDescription}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border border-border/70 shadow-none">
                <CardHeader className="gap-3">
                  <CardTitle>Environment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Focus</span>
                    <Badge variant="secondary">{adminSurface?.status ?? "planned"}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">API origin</p>
                    <p className="break-all font-medium">
                      {adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Runtime mode</p>
                    <p className="font-medium">{adminPublicEnv.NEXT_PUBLIC_APP_ENV}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <section
          aria-label="Workspace surfaces"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {datamixSurfaces.map((surface) => (
            <Card className="border border-border/70 shadow-sm" key={surface.id}>
              <CardHeader className="gap-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{surface.label}</CardTitle>
                  <Badge variant="secondary">{surface.status}</Badge>
                </div>
                <CardDescription className="text-sm leading-6">
                  {surface.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
