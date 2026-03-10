"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { handleSignOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

// Sidebar navigation items
const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

// Reusable nav link list for both desktop and mobile
function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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

  // Shared sidebar content
  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-800 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-none p-1.5">
          <Image
            src="/gwago.svg"
            alt="Gwago Logo"
            width={36}
            height={36}
            className="h-full w-full object-contain"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">GwAGO</p>
          <p className="text-[10px] text-zinc-500">Printing Services</p>
        </div>
      </div>

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
            <p className="truncate text-sm font-medium text-white">
              {user.name ?? "Admin"}
            </p>
            <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
          </div>
        </div>
        <form action={handleSignOut}>
          <Button
            variant="ghost"
            type="submit"
            className="mt-1 w-full justify-start gap-3 px-3 text-zinc-400 hover:bg-zinc-800 hover:text-white"
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
      {/* Desktop sidebar — fixed left */}
      <aside className="hidden h-screen w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 lg:fixed lg:inset-y-0 lg:left-0 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile header with sheet trigger */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur-sm lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 border-zinc-800 bg-zinc-950 p-0"
          >
            {sidebarContent}
          </SheetContent>
        </Sheet>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1">
          <Image
            src="/gwago.svg"
            alt="Gwago Logo"
            width={32}
            height={32}
            className="h-full w-full object-contain"
          />
        </div>
        <span className="text-sm font-semibold text-white">GwAGO</span>
      </header>
    </>
  );
}
