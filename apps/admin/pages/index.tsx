import { datamixProduct } from "@datamix/core";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildDatamixAdminPath } from "../lib/runtime";

export default function SplashPage() {
  return (
    <main className="min-h-svh bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader className="gap-4">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {datamixProduct.name}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 sm:text-base">
                {datamixProduct.tagline}. This root route is the editable splash page for the
                single Datamix app and can evolve into the eventual login or marketing entry
                experience.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border border-border/70 shadow-none">
                <CardHeader className="gap-2">
                  <CardTitle>Admin</CardTitle>
                  <CardDescription>
                    The authoring UI now lives under <code>/admin</code>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button asChild>
                    <a href={buildDatamixAdminPath()}>Open admin</a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={buildDatamixAdminPath("/login")}>Open login</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-border/70 shadow-none">
                <CardHeader className="gap-2">
                  <CardTitle>API</CardTitle>
                  <CardDescription>
                    The app’s backend surface now lives under <code>/api</code>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button asChild variant="outline">
                    <a href="/api">Open API root</a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="/api/health">Check health</a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href={buildDatamixAdminPath()}>Continue to admin</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/api/collections">Browse public collections</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
