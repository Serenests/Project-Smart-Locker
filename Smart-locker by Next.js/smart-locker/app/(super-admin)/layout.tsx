// app/dashboard/layout.tsx
'use client'

import { Shield, Database, User, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DashboardSidebar } from "./sidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { useEffect, useState } from "react";
import { authService, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DashboardLayout({ children }: {
    children: React.ReactNode 
}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  
  useEffect(() => {
    // ✅ ดึงข้อมูล user จาก authService
    const user = authService.getUser();
    setCurrentUser(user);
    
    // ✅ ถ้าไม่มี user (ไม่ได้ login) ให้ redirect
    if (!authService.isAuthenticated()) {
      router.push('/signin');
    }
  }, []);

  // ✅ ฟังก์ชันแปลง role เป็นชื่อภาษาไทย
  const getRoleName = (role: number) => {
    switch(role) {
      case 1: return 'System Administrator';
      case 2: return 'Organize Admin';
      case 3: return 'Department Admin';
      case 4: return 'User';
      default: return 'User';
    }
  };

  // ✅ ฟังก์ชันแปลง role เป็นชื่อภาษาอังกฤษ
  const getRoleNameEng = (role: number) => {
    switch(role) {
      case 1: return 'System Administrator';
      case 2: return 'Organize Admin';
      case 3: return 'Department Admin';
      case 4: return 'User';
      default: return 'User';
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex w-full">
        {/* Sidebar */}
        <DashboardSidebar />
        
        {/* Main Content Area */}
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="bg-white shadow-sm border-b sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center space-x-3">
                  <SidebarTrigger />
                  <Shield className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">ระบบจัดการตู้ล็อคเกอร์ยาควบคุม</h1>
                    <p className="text-sm text-gray-500">แผงควบคุมสำหรับผู้ดูแลระบบ - Opioid Management System</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Database className="h-3 w-3 mr-1" />
                    ระบบออนไลน์
                  </Badge>
                  
                  {/* ✅ แสดงข้อมูล user จริง */}
                  {currentUser ? (
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-xs text-gray-500">
                          {getRoleName(currentUser.role)}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {currentUser.firstName} {currentUser.lastName}
                        </p>
                        
                      </div>
                      
                      {/* ✅ ปุ่ม Logout */}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Loading...</p>
                      <p className="text-xs text-gray-500">กำลังโหลดข้อมูล</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl py-2 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}