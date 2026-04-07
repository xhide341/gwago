import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import Image from "next/image";

// Landing page — login-only interface (RSC)
export default async function LoginPage() {
  // If already authenticated, redirect to admin dashboard
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      {/* Subtle radial gradient overlay for depth */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03)_0%,transparent_60%)]" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <Image
              src="/gwago.svg"
              alt="Gwago logo"
              width={64}
              height={64}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Gwago
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Admin Portal</p>
        </div>

        {/* Login Card */}
        <LoginForm />
      </div>
    </div>
  );
}
