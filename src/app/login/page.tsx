import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import Image from "next/image";
import logoImg from "@/app/assets/icons/gwago-icon-raw.svg";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-50 transition-colors dark:bg-black">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.04)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03)_0%,transparent_60%)]" />

      <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
        <ThemeToggle className="dark:hover:text-primary border-zinc-200 bg-white/80 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-800" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-6 flex justify-center">
          <Link
            href="/"
            className="inline-block transition-transform duration-200 hover:scale-105 active:scale-95"
            aria-label="Back to Gwago home page"
          >
            <Image
              src={logoImg}
              alt="Gwago logo"
              width={64}
              height={64}
              className="size-20 object-contain dark:invert"
              priority
            />
          </Link>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
