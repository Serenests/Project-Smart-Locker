// app/auth/signin/page.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Lock, User, KeyRound, Mail, Smartphone } from "lucide-react"
import { useState } from 'react'
import axios from "axios"
import { useRouter } from "next/navigation"
import { config } from "@/app/config"
import Link from "next/link"
// ✅ import authService
import { authService } from "@/lib/auth"

export default function SignIn() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  const router = useRouter();
  const API_URL = config.apiUrl;

  const handleSignIn = async () => {
    // ตรวจสอบข้อมูลก่อนส่ง
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      setShowErrorDialog(true);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        identifier: identifier.trim(),
        password: password.trim(),
      }

      console.log('🔐 Sending login request...');
      console.log('Payload:', payload);

      const response = await axios.post(`${API_URL}/auth/signin`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('✅ Login response:', response.data);

      // ✅ ตรวจสอบว่ามี token และ user data
      if (response.data.token && response.data.user) {
        // ✅ ใช้ authService แทน localStorage
        authService.setToken(response.data.token);
        authService.setUser(response.data.user);

        console.log('✅ Token and user data saved');
        console.log('User data:', response.data.user);

        setRedirecting(true);

        // ✅ redirect ไปหน้า dashboard
        router.push('/dashboard');

      } else {
        setErrorMessage(response.data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
        setShowErrorDialog(true);
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);

      let message = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่';

      if (error.response) {
        console.error('Error response:', error.response.data);
        message = error.response.data.message || message;
      } else if (error.request) {
        console.error('No response:', error.request);
        message = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อ';
      } else {
        console.error('Error:', error.message);
      }

      setErrorMessage(message);
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  }

  const handleRFIDLogin = () => {
    alert('กรุณาแตะบัตร RFID ที่เครื่องอ่าน')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSignIn();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
              <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">Smart Locker System</h1>
              <p className="text-xs sm:text-sm text-gray-500">โรงพยาบาล</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-3 sm:px-4 py-6 sm:py-8">
        <div className="w-full max-w-sm sm:max-w-md space-y-4 sm:space-y-6">

          {/* Title Section */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <div className="bg-blue-100 p-3 sm:p-4 rounded-full">
                <Lock className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-blue-600" />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">เข้าสู่ระบบ</h2>
            <p className="text-sm sm:text-base text-gray-600">ระบบตู้ล็อกเกอร์อัจฉริยะ</p>
          </div>

          {/* Login Card */}
          <Card className="shadow-lg border-0 sm:border">
            <CardHeader className="px-4 sm:px-6 py-3 sm:py-4 space-y-1">
              <CardTitle className="text-lg sm:text-xl">กรอกข้อมูลเพื่อเข้าสู่ระบบ</CardTitle>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-2 sm:space-y-3">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-xs sm:text-sm font-medium">
                  บัตรประชาชน / อีเมล
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="กรอกเลขบัตรประชาชน รหัสบัตร หรือ อีเมล"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs sm:text-sm font-medium">
                  รหัสผ่าน
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="กรอกรหัสผ่าน"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Login Button */}
              <Button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 mt-2 sm:mt-4"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span className="text-sm sm:text-base">กำลังเข้าสู่ระบบ...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm sm:text-base">เข้าสู่ระบบ</span>
                  </div>
                )}
              </Button>
              <div className="text-xs sm:text-sm text-gray-500 text-center">
                ไม่มีบัญชีผู้ใช้?{" "}
                <Link href="/register" className="text-blue-600 hover:underline ">
                  ลงทะเบียน
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs sm:text-sm text-gray-500">
            <p>© Smart Locker System</p>
            <p className="mt-1">สำหรับบุคลากรโรงพยาบาลเท่านั้น</p>
          </div>
        </div>
      </div>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>เกิดข้อผิดพลาด</AlertDialogTitle>
            <AlertDialogDescription>
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowErrorDialog(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              ตกลง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading Overlay during redirect */}
      {redirecting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 sm:p-8 shadow-xl max-w-sm w-full">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-blue-600 border-t-transparent"></div>
              <div className="text-center">
                <p className="text-base sm:text-lg font-semibold text-gray-900">เข้าสู่ระบบสำเร็จ</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">กำลังนำคุณไปหน้าหลัก...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}