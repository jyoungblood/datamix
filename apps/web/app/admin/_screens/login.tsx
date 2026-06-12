"use client";

import { type DatamixAuthProviderId } from "@datamix/core";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";

import { CenteredCardPage } from "@/components/centered-card-page";
import { LoaderViewTransitionBoundary } from "@/components/loader-view-transition";
import { authClient } from "@/lib/auth-client";
import { buildDatamixAdminPath } from "@/lib/runtime";
import { useSetupStatus } from "@/lib/setup";

function readNextPath() {
  if (typeof window === "undefined") {
    return buildDatamixAdminPath();
  }

  const next = new URLSearchParams(window.location.search).get("next");

  return next && next.startsWith("/") ? next : buildDatamixAdminPath();
}

function readPrefillEmail() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("email") ?? "";
}

function createAdminReturnUrl(pathname: string) {
  if (typeof window === "undefined") {
    return pathname;
  }

  return new URL(pathname, window.location.origin).toString();
}

function readOAuthErrorMessage() {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");

  if (!error) {
    return null;
  }

  switch (error) {
    case "signup_disabled":
      return "OAuth sign-in is enabled, but Datamix still requires an existing or invited account. Ask an administrator for an invite first.";
    case "account_not_linked":
      return "Datamix found your email, but this social account could not be linked automatically. Try password sign-in first, then retry OAuth.";
    case "unable_to_link_account":
      return "Datamix could not link that social account. Make sure the invited email matches, or sign in with your password first.";
    case "oauth_provider_not_found":
      return "That OAuth provider is not enabled on this Datamix instance.";
    case "invalid_code":
      return "The OAuth handoff expired or was rejected. Try the sign-in button again.";
    case "email_not_found":
      return "The OAuth provider did not return an email address, so Datamix could not finish signing you in.";
    default:
      return params.get("error_description") ?? "Datamix could not complete the OAuth sign-in.";
  }
}

export default function LoginPage() {
  const session = authClient.useSession();
  const setupStatus = useSetupStatus();
  const setupStatusHeading =
    setupStatus.statusCode === 503
      ? "Auth config is incomplete"
      : "Datamix is temporarily unavailable";
  const [email, setEmail] = useState(readPrefillEmail);
  const [password, setPassword] = useState("");
  const [activeSocialProviderId, setActiveSocialProviderId] =
    useState<DatamixAuthProviderId | null>(null);
  const [isRedirectingToAdmin, setIsRedirectingToAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(readOAuthErrorMessage);
  const enabledOAuthProviders =
    setupStatus.oauth?.providers.filter((provider) => provider.enabled) ?? [];
  const shouldShowLoader =
    session.isPending ||
    setupStatus.isPending ||
    isRedirectingToAdmin ||
    Boolean(session.data) ||
    Boolean(setupStatus.data?.setupRequired);

  useEffect(() => {
    const nextPath = readNextPath();

    if (!session.isPending && session.data) {
      setIsRedirectingToAdmin(true);
      window.location.replace(nextPath);
    }
  }, [session.data, session.isPending]);

  useEffect(() => {
    if (!setupStatus.isPending && setupStatus.data?.setupRequired) {
      window.location.replace(buildDatamixAdminPath("/setup"));
    }
  }, [setupStatus.data, setupStatus.isPending]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await authClient.signIn.email(
      {
        email,
        password,
        rememberMe: true,
      },
      {
        onError(context) {
          setErrorMessage(context.error.message);
        },
      },
    );

    setIsSubmitting(false);

    if (result.data) {
      const nextPath = readNextPath();

      setIsRedirectingToAdmin(true);
      window.location.replace(nextPath);
    }
  };

  const handleSocialSignIn = async (providerId: DatamixAuthProviderId) => {
    setActiveSocialProviderId(providerId);
    setErrorMessage(null);

    const nextPath = readNextPath();
    const callbackURL = createAdminReturnUrl(nextPath);
    const errorCallbackURL = createAdminReturnUrl(
      `${buildDatamixAdminPath("/login")}?next=${encodeURIComponent(nextPath)}`,
    );

    const result = await authClient.signIn.social(
      {
        callbackURL,
        disableRedirect: true,
        errorCallbackURL,
        provider: providerId,
      },
      {
        onError(context) {
          setErrorMessage(context.error.message);
        },
      },
    );

    if (result.data?.url) {
      setIsRedirectingToAdmin(true);
      window.location.assign(result.data.url);
      return;
    }

    setActiveSocialProviderId(null);
    setErrorMessage((currentMessage) => currentMessage ?? "Unable to start OAuth sign-in.");
  };

  if (shouldShowLoader) {
    return <LoaderViewTransitionBoundary active>{null}</LoaderViewTransitionBoundary>;
  }

  if (setupStatus.errorMessage) {
    return (
      <LoaderViewTransitionBoundary active={false}>
        <CenteredCardPage
          description={setupStatus.errorMessage}
          label="Authentication"
          title={setupStatusHeading}
        >
          <Alert variant="destructive">
            <AlertDescription>
              {setupStatus.statusCode === 503
                ? "Set BETTER_AUTH_SECRET on the Datamix Worker, then reload this page."
                : "Datamix will retry automatically when the tab regains focus or the network comes back. You can also retry now."}
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
      </LoaderViewTransitionBoundary>
    );
  }

  return (
    <LoaderViewTransitionBoundary active={false}>
      <CenteredCardPage
        description="This instance already has an admin account, so Datamix is using the standard sign-in flow."
        label="Authentication"
        title="Sign in to Datamix"
      >
        {enabledOAuthProviders.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Optional OAuth is enabled for existing or invited Datamix users.
            </p>
            <div className="grid gap-2">
              {enabledOAuthProviders.map((provider) => (
                <Button
                  disabled={Boolean(activeSocialProviderId) || isSubmitting}
                  key={provider.id}
                  onClick={() => void handleSocialSignIn(provider.id)}
                  type="button"
                  variant="outline"
                >
                  {activeSocialProviderId === provider.id
                    ? `Redirecting to ${provider.label}...`
                    : `Continue with ${provider.label}`}
                </Button>
              ))}
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              id="password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <a
            className="inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
            href={buildDatamixAdminPath("/forgot-password")}
          >
            Forgot your password?
          </a>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a href="/">Back home</a>
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
      </CenteredCardPage>
    </LoaderViewTransitionBoundary>
  );
}
