import { useEffect, useState } from "react";

import { authClient } from "../lib/auth-client";
import { sendInvite } from "../lib/invite";
import { adminPublicEnv } from "../lib/runtime";
import { useSetupStatus } from "../lib/setup";

const loginHref = "/login?next=/admin";
const apiHealthHref = `${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}/health`;

const adminNavItems = [
  {
    id: "overview",
    label: "Dashboard",
    description: "Instance status and first actions",
    state: "current",
  },
  {
    id: "invite",
    label: "Team access",
    description: "Invite another admin through email",
    state: "ready",
  },
  {
    id: "collections",
    label: "Collections",
    description: "Schema builder arrives in M2",
    state: "soon",
  },
  {
    id: "media",
    label: "Media library",
    description: "Shared asset flows arrive in M4",
    state: "soon",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Project controls will expand later",
    state: "soon",
  },
] as const;

const nextSteps = [
  {
    title: "Invite another admin",
    description:
      "Use the live invite flow below when someone else needs access to this instance.",
  },
  {
    title: "Confirm the runtime is healthy",
    description:
      "Open the API health endpoint from this shell to verify the Worker contract is responding.",
  },
  {
    title: "Come back here for content work",
    description:
      "Collections are intentionally the next milestone. This dashboard stays the stable entry point.",
  },
] as const;

const shellCapabilities = [
  "Persistent browser session is active on the API origin.",
  "First-run setup is complete and public sign-up is closed again.",
  "Password reset and invite emails share the same auth email provider layer.",
] as const;

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

  const userLabel = session.data.user.name || session.data.user.email;

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
    <main className="admin-shell-page">
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label="Admin navigation">
          <div className="admin-brand">
            <p className="eyebrow">Datamix admin</p>
            <h1 className="admin-brand-title">Dashboard</h1>
            <p className="admin-brand-copy">
              Calm first-run home for auth, invites, and the slices that land next.
            </p>
          </div>

          <nav className="admin-nav">
            {adminNavItems.map((item) => {
              const itemClassName =
                item.state === "current"
                  ? "admin-nav-item is-current"
                  : item.state === "ready"
                    ? "admin-nav-item"
                    : "admin-nav-item is-muted";

              return item.state === "soon" ? (
                <div className={itemClassName} key={item.id}>
                  <div>
                    <p className="admin-nav-label">{item.label}</p>
                    <p className="admin-nav-copy">{item.description}</p>
                  </div>
                  <span className="status-pill status-pill-muted">Soon</span>
                </div>
              ) : (
                <a
                  aria-current={item.state === "current" ? "page" : undefined}
                  className={itemClassName}
                  href={`#${item.id}`}
                  key={item.id}
                >
                  <div>
                    <p className="admin-nav-label">{item.label}</p>
                    <p className="admin-nav-copy">{item.description}</p>
                  </div>
                  <span className="status-pill">
                    {item.state === "current" ? "Live" : "Ready"}
                  </span>
                </a>
              );
            })}
          </nav>

          <section className="admin-sidebar-card">
            <p className="admin-sidebar-heading">Current session</p>
            <p className="admin-sidebar-user">{userLabel}</p>
            <p className="admin-sidebar-copy">{session.data.user.email}</p>
            <div className="status-row">
              <span className="status-pill">Setup complete</span>
              <span className="status-pill status-pill-muted">
                {adminPublicEnv.NEXT_PUBLIC_APP_ENV}
              </span>
            </div>
          </section>
        </aside>

        <div className="admin-main">
          <header className="admin-topbar">
            <div>
              <p className="eyebrow">Authenticated shell</p>
              <h2 className="admin-page-title">Your Datamix instance is ready</h2>
              <p className="admin-page-copy">
                This is the first real admin frame: a stable landing page with clear next
                actions while collections and content tooling come online in the next
                slices.
              </p>
            </div>

            <div className="actions">
              <a className="button button-secondary" href="#invite">
                Invite teammate
              </a>
              <a
                className="button button-secondary"
                href={apiHealthHref}
                rel="noreferrer"
                target="_blank"
              >
                Check API health
              </a>
              <button className="button" onClick={handleSignOut} type="button">
                Sign out
              </button>
            </div>
          </header>

          <section className="admin-grid" id="overview">
            <article className="admin-card admin-card-hero">
              <p className="card-eyebrow">Landing state</p>
              <h3 className="card-title">No collections yet, and that is intentional</h3>
              <p className="card-copy">
                This M1-S5 slice stops at a coherent admin shell. The next milestone
                turns collections into the primary navigation and editing surface.
              </p>
              <div className="status-row">
                <span className="status-pill">Authenticated</span>
                <span className="status-pill">Invite flow live</span>
                <span className="status-pill status-pill-muted">Collections next</span>
              </div>
            </article>

            <article className="admin-card" id="collections">
              <p className="card-eyebrow">Empty state</p>
              <h3 className="card-title">What to do next</h3>
              <ol className="next-step-list">
                {nextSteps.map((step) => (
                  <li key={step.title}>
                    <p className="list-title">{step.title}</p>
                    <p className="list-copy">{step.description}</p>
                  </li>
                ))}
              </ol>
            </article>
          </section>

          <section className="admin-grid" aria-label="Shell capabilities">
            <article className="admin-card">
              <p className="card-eyebrow">In place today</p>
              <h3 className="card-title">This shell is already doing useful work</h3>
              <ul className="feature-list">
                {shellCapabilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="admin-card" id="media">
              <p className="card-eyebrow">Coming online later</p>
              <h3 className="card-title">Navigation is ready for growth</h3>
              <p className="card-copy">
                Collections, media, and broader settings stay visible here as quiet
                placeholders so contributors can extend the shell without rethinking the
                frame.
              </p>
            </article>
          </section>

          <section className="admin-grid">
            <article className="admin-card" id="invite">
              <p className="card-eyebrow">Team access</p>
              <h3 className="card-title">Invite a teammate</h3>
              <p className="card-copy">
                Datamix emails a secure invite link and routes the recipient through
                password setup on first sign-in.
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
            </article>

            <article className="admin-card" id="settings">
              <p className="card-eyebrow">Session and runtime</p>
              <h3 className="card-title">Stable foundation for the next slices</h3>
              <dl className="detail-list" id="session">
                <div>
                  <dt>Signed in as</dt>
                  <dd>{userLabel}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{session.data.user.email}</dd>
                </div>
                <div>
                  <dt>App environment</dt>
                  <dd>{adminPublicEnv.NEXT_PUBLIC_APP_ENV}</dd>
                </div>
                <div>
                  <dt>API origin</dt>
                  <dd>{adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}</dd>
                </div>
                <div>
                  <dt>Auth posture</dt>
                  <dd>Persisted better-auth session on the API Worker origin</dd>
                </div>
              </dl>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
