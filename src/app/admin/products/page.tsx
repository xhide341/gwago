import { getProducts } from "@/actions/products"
import { ProductsClient } from "@/components/products/products-client"

// Products page (RSC) — fetches products server-side, renders client table
export default async function ProductsPage() {
    const products = await getProducts()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Products</h1>
                <p className="text-sm text-zinc-500">
                    Manage your apparel catalog and variants
                </p>
            </div>

            <ProductsClient products={JSON.parse(JSON.stringify(products))} />
        </div>
    )
}
