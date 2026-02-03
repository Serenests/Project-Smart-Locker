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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Smart Locker System</h1>
              <p className="text-sm text-gray-500">โรงพยาบาล</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-md space-y-6">
          
          {/* Title Section */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <Lock className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบ</h2>
            <p className="text-gray-600">ระบบตู้ล็อกเกอร์อัจฉริยะ</p>
          </div>

          {/* Login Card */}
          <Card className="shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">กรอกข้อมูลเพื่อเข้าสู่ระบบ</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium">
                  CitizenID / CardID / Email
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
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
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
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Login Button */}
              <Button 
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>เข้าสู่ระบบ</span>
                  </div>
                )}
              </Button>
              <div className="text-sm text-gray-500 text-center">
                ไม่มีบัญชีผู้ใช้?{" "}
                <Link href="/register" className="text-blue-600 hover:underline ">
                  ลงทะเบียน
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* RFID Login Option */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 text-gray-500">หรือ</span>
            </div>
          </div>

          <Card className="border-dashed border-2 border-gray-200 hover:border-blue-300 transition-colors">
            <CardContent className="pt-6">
              <Button
                variant="outline"
                onClick={handleRFIDLogin}
                className="w-full border-gray-200 hover:bg-blue-50 hover:border-blue-300"
                size="lg"
                disabled={loading}
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <Smartphone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">ใช้บัตร RFID</div>
                    <div className="text-sm text-gray-500">แตะบัตรเพื่อเข้าสู่ระบบอัตโนมัติ</div>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
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
    </div>
  )
}