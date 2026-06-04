"use client";

import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CenteredCardPage } from "../components/centered-card-page";
import { authClient } from "../lib/auth-client";
import { buildDatamixAdminPath } from "../lib/runtime";
import { useSetupStatus } from "../lib/setup";

export default function SetupPage() {
  const session = authClient.useSession();
  const setupStatus = useSetupStatus();
  const setupStatusHeading =
    setupStatus.statusCode === 503
      ? "Auth config is incomplete"
      : "Datamix is temporarily unavailable";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (setupStatus.isPending || session.isPending) {
      return;
    }

    if (session.data) {
      window.location.replace(buildDatamixAdminPath());
      return;
    }

    if (setupStatus.data && !setupStatus.data.setupRequired) {
      window.location.replace(buildDatamixAdminPath("/login"));
    }
  }, [session.data, session.isPending, setupStatus.data, setupStatus.isPending]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage("Passwords must match.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await authClient.signUp.email(
      {
        name,
        email,
        password,
      },
      {
        onError(context) {
          setErrorMessage(context.error.message);
        },
      },
    );

    setIsSubmitting(false);

    if (result.data) {
      window.location.replace(buildDatamixAdminPath());
    }
  };

  if (setupStatus.isPending || session.isPending) {
    return (
      <CenteredCardPage
        description="Datamix is checking the auth tables and whether an admin account already exists."
        label="Setup"
        title="Preparing your first-run setup"
      />
    );
  }

  if (setupStatus.errorMessage) {
    return (
      <CenteredCardPage
        description={setupStatus.errorMessage}
        label="Setup"
        title={setupStatusHeading}
      >
        <Alert variant="destructive">
          <AlertDescription>
            {setupStatus.statusCode === 503
              ? "Set BETTER_AUTH_SECRET on the Datamix Worker, then reload this page."
              : "Datamix could not confirm first-run setup just now. Retry once the Worker app is reachable again."}
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <a href="/">Back home</a>
          </Button>
          <Button onClick={setupStatus.reload} type="button">
            Retry status
          </Button>
        </div>
      </CenteredCardPage>
    );
  }

  if (!setupStatus.data?.setupRequired) {
    return null;
  }

  return (
    <CenteredCardPage
      description="Create the first admin account for this instance. After that, public sign-up is disabled and the normal login screen takes over."
      label="First-run setup"
      title="Create the first Datamix admin"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            autoComplete="name"
            id="name"
            onChange={(event) => setName(event.target.value)}
            required
            type="text"
            value={name}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            autoComplete="email"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            autoComplete="new-password"
            id="password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            autoComplete="new-password"
            id="confirm-password"
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </div>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <a href="/">Back home</a>
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating admin..." : "Create admin account"}
          </Button>
        </div>
      </form>
    </CenteredCardPage>
  );
}
