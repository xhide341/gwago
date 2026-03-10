import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"

// Protected admin layout — redirects unauthenticated users to login
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user) {
        redirect("/")
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            <Sidebar user={session.user} />

            {/* Main content: offset by sidebar width on desktop */}
            <main className="lg:pl-64">
                <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
            </main>
        </div>
    )
}
