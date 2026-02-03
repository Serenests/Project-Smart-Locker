// app/dashboard/sidebar.tsx
'use client'
import { useEffect, useState } from "react";
import { authService, logout } from "@/lib/auth";
import { Users, Package, Lock, MapPin, History, BarChart3, Shield, Camera } from "lucide-react"
import Link from "next/link"
import {
  Sidebar,SidebarContent,SidebarFooter,SidebarGroup,SidebarGroupContent,SidebarGroupLabel,SidebarHeader,
  SidebarMenu,SidebarMenuButton,SidebarMenuItem,SidebarRail,
} from "@/components/ui/sidebar"

import { Badge } from "@/components/ui/badge"
import { usePathname, useRouter } from "next/navigation"

export function DashboardSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<any>(null)

    useEffect(() => {
        const user = authService.getUser();
        setCurrentUser(user);
        
        if (!authService.isAuthenticated()) {
          router.push('/signin');
        }
    }, [router]);

    // ฟังก์ชันตรวจสอบ role
    const canShowUserManagement = () => currentUser?.role !== 4
    const canShowProductManagement = () => currentUser?.role === 1 || currentUser?.role === 3
    const canShowLockerManagement = () => currentUser?.role === 1
    const canShowLocationManagement = () => currentUser?.role === 1 || currentUser?.role === 2
    const canShowTransactionHistory = () => currentUser?.role !== 4

    // ✅ สร้าง menuItems ใหม่พร้อม visible property
    const menuItems = [
      {
        title: "ภาพรวม",
        items: [
          {
            title: "แดชบอร์ด",
            url: "/dashboard",
            icon: BarChart3,
            description: "สถิติและสรุปข้อมูล",
            visible: true,
          },
        ],
      },
      {
        title: "การจัดการ",
        items: [
          {
            title: "จัดการผู้ใช้",
            url: "/user-management",
            icon: Users,
            description: "ผู้ใช้และสิทธิ์",
            visible: canShowUserManagement(),
          },
          {
            title: "จัดการยา",
            url: "/product-management",
            icon: Package,
            description: "รายการยาและสต็อก",
            visible: canShowProductManagement(),
          },
          {
            title: "จัดการตู้ล็อคเกอร์",
            url: "/locker-management",
            icon: Lock,
            description: "ตู้และช่องเก็บยา",
            visible: canShowLockerManagement(),
          },
          {
            title: "จัดการสถานที่",
            url: "/location-management",
            icon: MapPin,
            description: "สถานที่และกลุ่ม",
            visible: canShowLocationManagement(),
          },
        ],
      },
      {
        title: "รายงาน",
        items: [
          {
            title: "ประวัติการทำรายการ",
            url: "/transaction",
            icon: History,
            description: "ประวัติการเบิก-จ่าย",
            visible: canShowTransactionHistory(),
          },
        ],
      }
    ]

    return (
    <Sidebar collapsible="icon">
      {/* ... Header ... */}
      
      <SidebarContent>
        {menuItems.map((group) => {
          // ✅ กรองเฉพาะ items ที่ visible = true
          const visibleItems = group.items.filter(item => item.visible)
          
          // ถ้าไม่มี item ที่แสดงได้เลย ไม่ต้องแสดง group
          if (visibleItems.length === 0) return null
          
          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.url
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.description}>
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      
      {/* ... Footer ... */}
    </Sidebar>
  )
}