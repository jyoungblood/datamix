import { useEffect, useState } from "react";

import { authClient } from "../lib/auth-client";
import { sendInvite } from "../lib/invite";
import { useSetupStatus } from "../lib/setup";

const loginHref = "/login?next=/admin";

export default function AdminPage() {
  const session = authClient.useSession();
  const setupStatus = useSetupStatus();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (session.isPending || setupStatus.isPending || session.data) {
      return;
    }

    if (setupStatus.data?.setupRequired) {
      window.location.replace("/setup");
      return;
    }

    window.location.replace(loginHref);
  }, [session.data, session.isPending, setupStatus.data, setupStatus.isPending]);

  if (session.isPending || setupStatus.isPending) {
    return (
      <main className="shell">
        <div className="panel stack">
          <p className="eyebrow">Admin</p>
          <h1 className="page-title">Checking your session</h1>
          <p className="body">
            Datamix is asking the API Worker whether this browser already has a valid session.
          </p>
        </div>
      </main>
    );
  }

  if (setupStatus.errorMessage) {
    return (
      <main className="shell">
        <div className="panel stack">
          <p className="eyebrow">Admin</p>
          <h1 className="page-title">Auth config is incomplete</h1>
          <p className="body">{setupStatus.errorMessage}</p>
        </div>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.replace("/login");
  };

  const handleInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteError(null);
    setInviteMessage(null);
    setIsInviting(true);

    try {
      const message = await sendInvite(
        inviteName
          ? {
              email: inviteEmail,
              name: inviteName,
            }
          : {
              email: inviteEmail,
            },
      );

      setInviteMessage(message);
      setInviteEmail("");
      setInviteName("");
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to send invite.");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <main className="shell">
      <div className="panel stack">
        <p className="eyebrow">Admin</p>
        <h1 className="page-title">Authenticated shell</h1>
        <p className="body">
          This route is protected by a persisted `better-auth` session stored on the API
          origin.
        </p>

        <section className="surface-card stack" aria-label="Current session">
          <p className="surface-name">{session.data.user.name || session.data.user.email}</p>
          <p className="surface-description">{session.data.user.email}</p>
        </section>

        <section className="surface-card stack" aria-label="Invite a teammate">
          <p className="surface-name">Invite a teammate</p>
          <p className="surface-description">
            Datamix will email a secure invite link that drops them into password setup.
          </p>

          <form className="auth-form" onSubmit={handleInviteSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                onChange={(event) => setInviteName(event.target.value)}
                placeholder="Optional display name"
                type="text"
                value={inviteName}
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                onChange={(event) => setInviteEmail(event.target.value)}
                required
                type="email"
                value={inviteEmail}
              />
            </label>

            {inviteError ? <p className="form-error">{inviteError}</p> : null}
            {inviteMessage ? <p className="form-success">{inviteMessage}</p> : null}

            <div className="actions">
              <button className="button" disabled={isInviting} type="submit">
                {isInviting ? "Sending invite..." : "Send invite"}
              </button>
            </div>
          </form>
        </section>

        <div className="actions">
          <a className="button button-secondary" href="/">
            Back home
          </a>
          <button className="button" onClick={handleSignOut} type="button">
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
