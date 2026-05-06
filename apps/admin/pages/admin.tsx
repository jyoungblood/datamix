import { useEffect } from "react";

import { authClient } from "../lib/auth-client";

const loginHref = "/login?next=/admin";

export default function AdminPage() {
  const session = authClient.useSession();

  useEffect(() => {
    if (!session.isPending && !session.data) {
      window.location.replace(loginHref);
    }
  }, [session.data, session.isPending]);

  if (session.isPending) {
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

  if (!session.data) {
    return null;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.replace("/login");
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
