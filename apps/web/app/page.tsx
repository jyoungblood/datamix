import { datamixProduct } from "@datamix/core";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildDatamixAdminPath } from "@/lib/runtime";

export default function SplashPage() {
  return (
    <main className="min-h-svh bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <Card className="border border-border/70 shadow-none">
            <CardHeader className="gap-4">
              <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {datamixProduct.name}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 sm:text-base">
                {datamixProduct.tagline}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <a href={buildDatamixAdminPath()}>Admin</a>
              </Button>
              <Button asChild variant="outline">
                <a href={buildDatamixAdminPath("/login")}>Login</a>
              </Button>
            </CardContent>
          </Card>
      </div>
    </main>
  );
}
