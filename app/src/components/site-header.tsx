"use client";

import { useSession } from "next-auth/react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeSelector } from "@/components/theme-selector";
import { ModeSwitcher } from "./mode-switcher";
import { UserNav } from "@/components/user-nav";
import { LanguageSwitcher } from "@/components/language-switcher";

export function SiteHeader() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) md:rounded-t-xl">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        
        {isAuthenticated && (
          <>
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4"
            />
          </>
        )}

        <h1 className="text-base font-medium"></h1>
        
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <UserNav />
        </div>
      </div>
    </header>
  );
}