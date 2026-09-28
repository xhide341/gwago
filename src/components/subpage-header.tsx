import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export interface SubpageHeaderProps {
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function SubpageHeader({
  backHref = "/",
  backLabel = "Back to Home",
  className = "",
}: SubpageHeaderProps) {
  return (
    <header
      className={`border-border/60 bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md ${className}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>{backLabel}</span>
          </Link>
        </div>

        <Link href="/" className="font-primary text-2xl font-black tracking-tight sm:text-3xl">
          GWAGO
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
