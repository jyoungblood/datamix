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

export default function LoginPage() {
  const session = authClient.useSession();
  const setupStatus = useSetupStatus();
  const [email, setEmail] = useState(readPrefillEmail);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

        <form className="auth-form" onSubmit={handleSubmit}>
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
