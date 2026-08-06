"use client"

import {
  IconChartBar, 
  IconTrendingUp, 
  IconPigMoney,
  IconChartPie
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

export function NavSecondary() {
  const t = useTranslations("Sidebar"); 

  const items = [
    {
      title: t("cashFlow"),
      url: "/cash-flow",
      icon: IconChartBar,
    },
    {
      title: t("trends"),
      url: "/trends",
      icon: IconTrendingUp,
    },
    {
      title: t("categoryStats"),
      url: "/category-stats",
      icon: IconChartPie,
    },
    {
      title: t("wealth"),
      url: "/wealth",
      icon: IconPigMoney,
    },
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