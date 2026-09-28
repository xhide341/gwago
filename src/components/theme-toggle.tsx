"use client";

import { useRef, useEffect, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import gsap from "gsap";
import { cn } from "@/lib/utils";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("block", className)}
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("block", className)}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const emptySubscribe = () => () => {};

const sizeClasses = {
  sm: "size-8",
  default: "size-8 sm:size-9",
  responsive: "size-8 sm:size-9 md:size-10 lg:size-11 xl:size-12",
};

const iconSizeClasses = {
  sm: "size-4",
  default: "size-4 sm:size-4.5",
  responsive: "size-4 sm:size-[18px] md:size-5 lg:size-5 xl:size-6",
};

export function ThemeToggle({
  className,
  iconClassName,
  size = "sm",
}: {
  className?: string;
  iconClassName?: string;
  size?: "sm" | "default" | "responsive";
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const iconRef = useRef<HTMLSpanElement>(null);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (mounted && iconRef.current) gsap.set(iconRef.current, { scale: 1, rotate: 0 });
  }, [mounted]);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  function handleToggle() {
    const isCurrentlyDark = resolvedTheme === "dark";
    const nextTheme = isCurrentlyDark ? "light" : "dark";
    const el = iconRef.current;
    if (!el) {
      setTheme(nextTheme);
      return;
    }

    gsap.to(el, {
      rotate: 180,
      scale: 0,
      duration: 0.25,
      ease: "expo.in",
      onComplete: () => {
        setTheme(nextTheme);
        gsap.set(el, { rotate: -180 });
        gsap.to(el, {
          rotate: 0,
          scale: 1,
          duration: 0.35,
          ease: "expo.out",
        });
      },
    });
  }

  return (
    <button
      id="theme-toggle"
      type="button"
      onClick={handleToggle}
      aria-label={
        !mounted ? "Toggle theme" : isDark ? "Switch to light mode" : "Switch to dark mode"
      }
      suppressHydrationWarning
      className={cn(
        "border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5 inline-flex shrink-0 items-center justify-center rounded-md border backdrop-blur-sm transition-colors duration-200 active:scale-95",
        sizeClasses[size],
        className,
      )}
    >
      <span ref={iconRef} className="flex items-center justify-center">
        {!mounted ? (
          <span className={cn("block", iconSizeClasses[size], iconClassName)} />
        ) : isDark ? (
          <MoonIcon className={cn(iconSizeClasses[size], iconClassName)} />
        ) : (
          <SunIcon className={cn(iconSizeClasses[size], iconClassName)} />
        )}
      </span>
    </button>
  );
}
