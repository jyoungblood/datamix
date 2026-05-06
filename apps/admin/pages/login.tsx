import { useEffect, useMemo, useState } from "react";

import { authClient } from "../lib/auth-client";

function readNextPath() {
  if (typeof window === "undefined") {
    return "/admin";
  }

  const next = new URLSearchParams(window.location.search).get("next");

  return next && next.startsWith("/") ? next : "/admin";
}

export default function LoginPage() {
  const session = authClient.useSession();
  const nextPath = useMemo(readNextPath, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session.isPending && session.data) {
      window.location.replace(nextPath);
    }
  }, [nextPath, session.data, session.isPending]);

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
      window.location.replace(nextPath);
    }
  };

  return (
    <main className="shell">
      <div className="panel stack">
        <p className="eyebrow">Authentication</p>
        <h1 className="page-title">Sign in to Datamix</h1>
        <p className="body">
          This slice wires persistent email/password sessions into the Cloudflare Worker.
          M1-S3 will add the real first-run account creation flow on top of the same auth
          surface.
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
