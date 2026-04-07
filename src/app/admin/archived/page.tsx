import { getArchivedProducts, getArchivedVariants } from "@/actions/products";
import { ArchivedClient } from "@/components/archived/archived-client";

// Archived items page (RSC) — fetches archived products server-side
export default async function ArchivedPage() {
  const [products, variants] = await Promise.all([
    getArchivedProducts(),
    getArchivedVariants(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Archives</h1>
        <p className="text-sm text-zinc-500">
          Products that have been deactivated. Permanently delete or restore
          them here.
        </p>
      </div>

      <ArchivedClient
        products={JSON.parse(JSON.stringify(products))}
        variants={JSON.parse(JSON.stringify(variants))}
      />
    </div>
  );
}
