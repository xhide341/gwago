import { auth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Shield, Mail } from "lucide-react"

// Settings page (RSC) — admin profile and system info
export default async function SettingsPage() {
    const session = await auth()
    const adminEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-sm text-zinc-500">
                    Admin profile and system configuration
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Profile Card */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base text-white">
                            <User className="h-4 w-4 text-zinc-500" />
                            Admin Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-xs font-medium uppercase text-zinc-500">Name</p>
                            <p className="mt-1 text-sm text-white">
                                {session?.user?.name ?? "—"}
                            </p>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div>
                            <p className="text-xs font-medium uppercase text-zinc-500">Email</p>
                            <p className="mt-1 text-sm text-white">
                                {session?.user?.email ?? "—"}
                            </p>
                        </div>
                        <Separator className="bg-zinc-800" />
                        <div>
                            <p className="text-xs font-medium uppercase text-zinc-500">Role</p>
                            <Badge
                                variant="outline"
                                className="mt-1 border-zinc-700 text-zinc-300"
                            >
                                {session?.user?.role ?? "ADMIN"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Admin Allowlist Card */}
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base text-white">
                            <Shield className="h-4 w-4 text-zinc-500" />
                            Admin Email Allowlist
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-4 text-xs text-zinc-500">
                            Only these emails can log into the admin panel. Update the{" "}
                            <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">
                                ADMIN_EMAILS
                            </code>{" "}
                            environment variable to modify.
                        </p>
                        <div className="space-y-2">
                            {adminEmails.map((email) => (
                                <div
                                    key={email}
                                    className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
                                >
                                    <Mail className="h-3.5 w-3.5 text-zinc-500" />
                                    <span className="text-sm text-zinc-300">{email}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* System Info Card */}
                <Card className="border-zinc-800 bg-zinc-900/50 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base text-white">System Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                                <p className="text-xs font-medium uppercase text-zinc-500">Framework</p>
                                <p className="mt-1 text-sm text-white">Next.js 15 (App Router)</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                                <p className="text-xs font-medium uppercase text-zinc-500">Database</p>
                                <p className="mt-1 text-sm text-white">PostgreSQL + Prisma</p>
                            </div>
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                                <p className="text-xs font-medium uppercase text-zinc-500">Authentication</p>
                                <p className="mt-1 text-sm text-white">Auth.js v5 (JWT)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
