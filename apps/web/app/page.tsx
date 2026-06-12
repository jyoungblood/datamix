import { datamixProduct } from "@datamix/core";
import { Blocks } from "lucide-react";
import Link from "next/link";

import { buildDatamixAdminPath } from "@/lib/runtime";

export default function SplashPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--sidebar)] px-6 py-8">
      <Link
        aria-label={`Open ${datamixProduct.name} admin`}
        className="flex items-center gap-4 text-white transition-opacity opacity-85 hover:opacity-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-300/50"
        href={buildDatamixAdminPath()}
        prefetch={true}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]">
          <Blocks aria-hidden="true" className="h-7 w-7 text-blue-100" />
        </span>
        <span className="font-heading text-xl font-extrabold tracking-wide text-white">
          {datamixProduct.name.toUpperCase()}
        </span>
      </Link>
    </main>
  );
}
