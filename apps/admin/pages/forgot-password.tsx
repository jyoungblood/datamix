import { useState } from "react";

import { authClient } from "../lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const redirectTo = new URL("/reset-password", window.location.origin).toString();
    const result = await authClient.requestPasswordReset(
      {
        email,
        redirectTo,
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

  return (
    <main className="shell">
      <div className="panel stack">
        <p className="eyebrow">Authentication</p>
        <h1 className="page-title">Reset your password</h1>
        <p className="body">
          Enter the email address for your Datamix account and we’ll send a secure reset
          link if the account exists.
        </p>

        {isSubmitted ? (
          <section className="surface-card stack">
            <p className="surface-name">Check your inbox</p>
            <p className="surface-description">
              If that email exists in Datamix, a reset link is on its way.
            </p>
          </section>
        ) : (
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

            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

            <div className="actions">
              <a className="button button-secondary" href="/login">
                Back to login
              </a>
              <button className="button" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
