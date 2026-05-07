import { datamixProduct, datamixSurfaces } from "@datamix/core";
import { adminPublicEnv } from "../lib/runtime";
import { authClient } from "../lib/auth-client";
import { useSetupStatus } from "../lib/setup";

const adminSurface = datamixSurfaces.find((surface) => surface.id === "admin");

export default function HomePage() {
  const session = authClient.useSession();
  const setupStatus = useSetupStatus();
  const setupStatusHeading =
    setupStatus.statusCode === 503
      ? "Auth config is incomplete"
      : "Setup status is temporarily unavailable";

  const authDescription = setupStatus.isPending
    ? "Checking whether this instance still needs its first admin account..."
    : setupStatus.errorMessage
      ? setupStatus.errorMessage
      : setupStatus.data?.setupRequired
        ? "No admin exists yet. This instance is ready for first-run setup."
        : session.data
          ? `Signed in as ${session.data.user.email}.`
          : "Admin account exists. Sign in to continue.";

  return (
    <main className="shell">
      <div className="panel stack">
        <p className="eyebrow">Datamix v0</p>
        <h1 className="page-title">{datamixProduct.name}</h1>
        <p className="lede">{datamixProduct.tagline}</p>
        <p className="body">
          The admin app is scaffolded with Vinext and kept intentionally narrow while the
          foundation slices are still in motion. Auth now lives on the API Worker and the
          first authenticated admin shell is wired.
        </p>

        <section className="surface-list" aria-label="Workspace surfaces">
          {datamixSurfaces.map((surface) => (
            <article className="surface-card" key={surface.id}>
              <p className="surface-name">{surface.label}</p>
              <p className="surface-description">{surface.description}</p>
            </article>
          ))}
        </section>

        <section className="surface-card stack" aria-label="Authentication status">
          <p className="surface-name">Authentication status</p>
          <p className="surface-description">
            {setupStatus.errorMessage ? `${setupStatusHeading}. ${authDescription}` : authDescription}
          </p>

          <div className="actions">
            {setupStatus.data?.setupRequired ? (
              <a className="button button-secondary" href="/setup">
                Start first-run setup
              </a>
            ) : (
              <a className="button button-secondary" href="/login">
                {session.data ? "Switch account" : "Open login"}
              </a>
            )}
            {setupStatus.errorMessage ? (
              <button className="button button-secondary" onClick={setupStatus.reload} type="button">
                Retry status
              </button>
            ) : null}
            <a className="button" href="/admin">
              Open admin dashboard
            </a>
          </div>
        </section>

        <p className="status">
          Current focus: <strong>{adminSurface?.status ?? "planned"}</strong>
        </p>
        <p className="status">
          API origin: <strong>{adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}</strong>
        </p>
        <p className="status">
          Runtime mode: <strong>{adminPublicEnv.NEXT_PUBLIC_APP_ENV}</strong>
        </p>
      </div>
    </main>
  );
}
