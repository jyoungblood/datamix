import { useMemo, useState } from "react";

import { authClient } from "../lib/auth-client";

function readResetParams() {
  if (typeof window === "undefined") {
    return {
      email: "",
      error: "",
      mode: "reset",
      token: "",
    };
  }

  const searchParams = new URLSearchParams(window.location.search);

  return {
    email: searchParams.get("email") ?? "",
    error: searchParams.get("error") ?? "",
    mode: searchParams.get("mode") === "invite" ? "invite" : "reset",
    token: searchParams.get("token") ?? "",
  } as const;
}

export default function ResetPasswordPage() {
  const params = useMemo(readResetParams, []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    params.error === "INVALID_TOKEN" ? "This reset link is invalid or has expired." : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!params.token) {
      setErrorMessage("This reset link is missing its token.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords must match.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await authClient.resetPassword(
      {
        newPassword: password,
        token: params.token,
      },
      {
        onError(context) {
          setErrorMessage(context.error.message);
        },
      },
    );

    setIsSubmitting(false);

    if (result.data) {
      setIsSubmitted(true);
    }
  };

  const heading =
    params.mode === "invite" ? "Accept your invite" : "Choose a new password";
  const description =
    params.mode === "invite"
      ? "Set your password to finish joining this Datamix instance."
      : "Choose a new password for your Datamix account.";
  const loginHref = params.email
    ? `/login?email=${encodeURIComponent(params.email)}`
    : "/login";

  return (
    <main className="shell">
      <div className="panel stack">
        <p className="eyebrow">Authentication</p>
        <h1 className="page-title">{heading}</h1>
        <p className="body">{description}</p>

        {isSubmitted ? (
          <section className="surface-card stack">
            <p className="surface-name">
              {params.mode === "invite" ? "Invite accepted" : "Password updated"}
            </p>
            <p className="surface-description">
              Sign in with your new password to continue.
            </p>
            <div className="actions">
              <a className="button" href={loginHref}>
                Go to login
              </a>
            </div>
          </section>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>New password</span>
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
              <a className="button button-secondary" href="/login">
                Back to login
              </a>
              <button className="button" disabled={isSubmitting} type="submit">
                {isSubmitting
                  ? "Saving..."
                  : params.mode === "invite"
                    ? "Set password and continue"
                    : "Reset password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
