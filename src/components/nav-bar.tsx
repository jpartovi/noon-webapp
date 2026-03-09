"use client";

import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Users, CalendarDays, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavBar() {
  const user = useQuery(api.users.getMe);
  const { signOut } = useAuthActions();
  const router = useRouter();

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "Account"
    : "Account";

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <button
          onClick={() => router.push("/")}
          className="text-lg font-semibold tracking-tight hover:opacity-70 transition-opacity"
        >
          noon
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium",
              "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            )}
          >
            {displayName}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto">
            <DropdownMenuItem onClick={() => router.push("/calendar")}>
              <CalendarDays className="size-4" />
              Calendar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/friends")}>
              <Users className="size-4" />
              Friends
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/calendar-accounts")}>
              <Settings className="size-4" />
              Accounts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
