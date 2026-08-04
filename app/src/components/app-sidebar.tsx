"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Link } from "@/i18n/routing"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavFooter } from "@/components/nav-footer"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { status } = useSession();
  const { isMobile, setOpenMobile, open } = useSidebar(); 

  React.useEffect(() => {
    document.cookie = `sidebar:state=${open}; path=/; max-age=31536000`;
  }, [open]);

  if (status !== "authenticated") {
    return null;
  }

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="offcanvas" className="overflow-x-hidden" {...props}>
      <SidebarHeader className="overflow-hidden py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2 h-auto w-full hover:bg-transparent"
            >
              <Link href="/" onClick={handleLinkClick} className="flex items-center w-full overflow-hidden">
                <span className="font-extrabold tracking-tight text-5xl inline-block bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent leading-normal">
                  FinSight
                </span> 
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="overflow-x-hidden" onClick={handleLinkClick}>
        <NavMain />
        <NavSecondary className="mt-auto" />
        <SidebarSeparator className="mx-2" />
        <NavFooter />
      </SidebarContent>
    </Sidebar>
  )
}