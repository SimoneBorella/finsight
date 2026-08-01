"use client"

import * as React from "react"
import { IconSettings, IconHelp, IconBrandGithub, IconBrandLinkedin, type Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "./ui/button"

export function NavFooter(props: React.ComponentPropsWithoutRef<typeof SidebarGroup>) {

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          
          <SidebarMenuItem key={"GitHub"}>
            <SidebarMenuButton asChild>
              <a href={"https://github.com/SimoneBorella/finsight.git"}>
                <IconBrandGithub />
                <span>GitHub</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem key={"LinkedIn"}>
            <SidebarMenuButton asChild>
              <a href={"https://www.linkedin.com/in/simoneborella/"}>
                <IconBrandLinkedin />
                <span>LinkedIn</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
