import { getInventory } from "@/actions/inventory"
import { InventoryClient } from "@/components/inventory/inventory-client"

// Inventory page (RSC) — fetches stock data server-side
export default async function InventoryPage() {
    const inventory = await getInventory()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Inventory</h1>
                <p className="text-sm text-zinc-500">
                    Monitor and adjust stock levels
                </p>
            </div>

            <InventoryClient inventory={JSON.parse(JSON.stringify(inventory))} />
        </div>
    )
}
