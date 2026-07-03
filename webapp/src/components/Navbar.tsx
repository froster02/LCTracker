"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-bold tracking-tight">
          LeetCode Galaxy
        </Link>

        {user ? (
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/reviews" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Reviews
            </Link>
            <Link href="/dashboard/history" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              History
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none cursor-pointer">
                <Avatar className="h-8 w-8">
                  {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                  <AvatarFallback>{user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? "U"}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Link href="/auth/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
