import { useEffect, useState } from "react";

import { authClient } from "../lib/auth-client";
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
      window.location.replace("/admin");
      return;
    }

    if (setupStatus.data && !setupStatus.data.setupRequired) {
      window.location.replace("/login");
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
      window.location.replace("/admin");
    }
  };

  if (setupStatus.isPending || session.isPending) {
    return (
      <main className="shell">
        <div className="panel stack">
          <p className="eyebrow">Setup</p>
          <h1 className="page-title">Preparing your first-run setup</h1>
          <p className="body">
            Datamix is checking the auth tables and whether an admin account already exists.
          </p>
        </div>
      </main>
    );
  }

  if (setupStatus.errorMessage) {
    return (
      <main className="shell">
        <div className="panel stack">
          <p className="eyebrow">Setup</p>
          <h1 className="page-title">{setupStatusHeading}</h1>
          <p className="body">{setupStatus.errorMessage}</p>
          {setupStatus.statusCode === 503 ? (
            <p className="body">
              Set `BETTER_AUTH_SECRET` on the API Worker, then reload this page.
            </p>
          ) : (
            <p className="body">
              Datamix could not confirm first-run setup status just now. Retry once the API
              Worker is reachable again.
            </p>
          )}
          <div className="actions">
            <a className="button button-secondary" href="/">
              Back home
            </a>
            <button className="button" onClick={setupStatus.reload} type="button">
              Retry status
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!setupStatus.data?.setupRequired) {
    return null;
  }

  return (
    <main className="shell">
      <div className="panel stack">
        <p className="eyebrow">First-run setup</p>
        <h1 className="page-title">Create the first Datamix admin</h1>
        <p className="body">
          This account bootstraps the instance entirely in-browser. After it exists, public
          sign-up is disabled and the normal login screen takes over.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              required
              type="text"
              value={name}
            />
          </label>

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
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <div className="actions">
            <a className="button button-secondary" href="/">
              Back home
            </a>
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating admin..." : "Create admin account"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
