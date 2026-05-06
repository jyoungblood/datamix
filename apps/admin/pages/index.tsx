import { adminPublicEnv } from "../lib/runtime";
import { datamixProduct, datamixSurfaces } from "@datamix/core";

const adminSurface = datamixSurfaces.find((surface) => surface.id === "admin");

export default function HomePage() {
  return (
    <main className="shell">
      <div className="panel">
        <p className="eyebrow">Datamix v0</p>
        <h1>{datamixProduct.name}</h1>
        <p className="lede">{datamixProduct.tagline}</p>
        <p className="body">
          The admin app is scaffolded with Vinext and kept intentionally narrow while the
          foundation slices are still in motion.
        </p>

        <section className="surface-list" aria-label="Workspace surfaces">
          {datamixSurfaces.map((surface) => (
            <article className="surface-card" key={surface.id}>
              <p className="surface-name">{surface.label}</p>
              <p className="surface-description">{surface.description}</p>
            </article>
          ))}
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
