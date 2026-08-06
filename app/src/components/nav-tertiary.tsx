"use client"

import { 
  IconTargetArrow,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavTertiary() {
  const t = useTranslations("Sidebar"); 

  const items = [
    {
      title: t("objectives"),
      url: "/objectives",
      icon: IconTargetArrow,
    }
  ];

  return (
    <SidebarGroup>
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