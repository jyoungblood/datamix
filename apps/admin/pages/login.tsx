import { type DatamixAuthProviderId } from "@datamix/core";
import { useEffect, useState } from "react";

import { authClient } from "../lib/auth-client";
import { useSetupStatus } from "../lib/setup";

function readNextPath() {
  if (typeof window === "undefined") {
    return "/admin";
  }

  const next = new URLSearchParams(window.location.search).get("next");

  return next && next.startsWith("/") ? next : "/admin";
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
  const [email, setEmail] = useState(readPrefillEmail);
  const [password, setPassword] = useState("");
  const [activeSocialProviderId, setActiveSocialProviderId] =
    useState<DatamixAuthProviderId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(readOAuthErrorMessage);
  const enabledOAuthProviders =
    setupStatus.oauth?.providers.filter((provider) => provider.enabled) ?? [];

  useEffect(() => {
    const nextPath = readNextPath();

    if (!session.isPending && session.data) {
      window.location.replace(nextPath);
    }
  }, [session.data, session.isPending]);

  useEffect(() => {
    if (!setupStatus.isPending && setupStatus.data?.setupRequired) {
      window.location.replace("/setup");
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
      window.location.replace(readNextPath());
    }
  };

  const handleSocialSignIn = async (providerId: DatamixAuthProviderId) => {
    setActiveSocialProviderId(providerId);
    setErrorMessage(null);

    const nextPath = readNextPath();
    const callbackURL = createAdminReturnUrl(nextPath);
    const errorCallbackURL = createAdminReturnUrl(
      `/login?next=${encodeURIComponent(nextPath)}`,
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
      window.location.assign(result.data.url);
      return;
    }

    setActiveSocialProviderId(null);
    setErrorMessage((currentMessage) => currentMessage ?? "Unable to start OAuth sign-in.");
  };

  if (session.isPending || setupStatus.isPending) {
    return (
      <main className="shell">
        <div className="panel stack">
          <p className="eyebrow">Authentication</p>
          <h1 className="page-title">Checking this Datamix instance</h1>
          <p className="body">
            Datamix is deciding whether to show the first-run setup or the normal sign-in
            flow.
          </p>
        </div>
      </main>
    );
  }

  if (setupStatus.errorMessage) {
    return (
      <main className="shell">
        <div className="panel stack">
          <p className="eyebrow">Authentication</p>
          <h1 className="page-title">Auth config is incomplete</h1>
          <p className="body">{setupStatus.errorMessage}</p>
          <p className="body">
            Set `BETTER_AUTH_SECRET` on the API Worker, then reload this page.
          </p>
        </div>
      </main>
    );
  }

  if (setupStatus.data?.setupRequired) {
    return null;
  }

  return (
    <main className="shell">
      <div className="panel stack">
        <p className="eyebrow">Authentication</p>
        <h1 className="page-title">Sign in to Datamix</h1>
        <p className="body">
          This instance already has an admin account, so Datamix is using the normal
          persistent sign-in flow.
        </p>

        {enabledOAuthProviders.length > 0 ? (
          <div className="section-stack">
            <p className="helper-text">
              Optional OAuth is enabled for existing or invited Datamix users.
            </p>
            <div className="actions">
              {enabledOAuthProviders.map((provider) => (
                <button
                  className="button button-secondary"
                  disabled={Boolean(activeSocialProviderId) || isSubmitting}
                  key={provider.id}
                  onClick={() => void handleSocialSignIn(provider.id)}
                  type="button"
                >
                  {activeSocialProviderId === provider.id
                    ? `Redirecting to ${provider.label}...`
                    : `Continue with ${provider.label}`}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {enabledOAuthProviders.length > 0 ? (
            <p className="helper-text">Or continue with email and password.</p>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <p className="inline-link-row">
            <a href="/forgot-password">Forgot your password?</a>
          </p>

          <div className="actions">
            <a className="button button-secondary" href="/">
              Back home
            </a>
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
