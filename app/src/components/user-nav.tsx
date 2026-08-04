"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl"; 
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserNav() {
  const { data: session, status } = useSession();
  const t = useTranslations("Header"); 
  const tSettings = useTranslations("Settings"); 

  if (status === "loading") {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-muted"></div>;
  }

  if (status === "unauthenticated" || !session) {
    return <div />;
  }

  const getNameInitials = (name?: string | null) => {
    if (!name) return "U";
    if (name.toLowerCase() === "admin") return "AD";
    
    if (name.includes(".")) {
      const parts = name.split(".");
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getNameInitials(session.user?.name);
  
  // Casting inline tipizzato per evitare "any" e passare indenne il linter di Next.js
  const userRole = (session.user as { role?: string })?.role;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full focus-visible:ring-0">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user?.email}
            </p>
            
            {/* Badge Dinamico per Ruolo */}
            {userRole === "superuser" && (
              <span className="mt-1 inline-flex w-fit items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                {tSettings("usersManagement.roleSuperuser", { default: "Superuser" })}
              </span>
            )}
            {userRole === "admin" && (
              <span className="mt-1 inline-flex w-fit items-center rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                {tSettings("usersManagement.roleAdmin", { default: "Admin" })}
              </span>
            )}
            {userRole === "user" && (
              <span className="mt-1 inline-flex w-fit items-center rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                {tSettings("usersManagement.roleUser", { default: "Utente" })}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}