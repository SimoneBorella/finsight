"use client"

import * as React from "react"
import { IconNotes, IconSettings } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({ ...props }: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  
  const t = useTranslations("Sidebar");

  const items = [
    {
      title: t("annotations"),
      url: "/annotations",
      icon: IconNotes,
    },
    {
      title: t("settings"),
      url: "/settings",
      icon: IconSettings,
    }
  ];

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild>
                <Link href={item.url as any}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}