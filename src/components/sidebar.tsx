"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import logoImg from "@/app/assets/icons/gwago-icon-raw.svg";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { handleSignOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/archived", label: "Archives", icon: Archive },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 space-y-1 py-4 pr-3 pl-1">
      {navItems.map((item) => {
        const isActive =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <Link
        href="/admin"
        className="flex h-20 items-center gap-3.5 border-b border-zinc-800 px-4 transition-colors hover:bg-zinc-900/40"
      >
        <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden">
          <Image
            src={logoImg}
            alt="Gwago Logo"
            width={32}
            height={32}
            className="size-full scale-[2.0] object-contain dark:invert"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-primary text-primary text-lg font-semibold tracking-normal sm:text-xl">
            GwAGO
          </p>
          <p className="text-sm text-zinc-400">Printing Services</p>
        </div>
      </Link>

      {/* Navigation */}
      <NavLinks pathname={pathname} />

      <Separator className="bg-zinc-800" />

      {/* User section + sign out */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback className="bg-zinc-800 text-xs text-white">
              {user.name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "A"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium text-white">{user.name ?? "Admin"}</p>
            <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
          </div>
        </div>
        <form action={handleSignOut}>
          <Button
            variant="ghost"
            type="submit"
            className="mt-1 w-full cursor-pointer justify-start gap-3 bg-zinc-900 px-3 text-zinc-200 hover:bg-zinc-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 lg:fixed lg:inset-y-0 lg:left-0 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur-sm lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-zinc-800 bg-zinc-950 p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden">
            <Image
              src={logoImg}
              alt="Gwago Logo"
              width={32}
              height={32}
              className="size-full scale-[2.0] object-contain dark:invert"
            />
          </div>
          <span className="font-primary text-base font-bold text-white uppercase">GwAGO</span>
        </Link>
      </header>
    </>
  );
}
