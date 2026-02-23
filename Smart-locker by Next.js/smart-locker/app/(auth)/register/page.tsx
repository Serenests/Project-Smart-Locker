'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Lock, User, Mail, Phone, MapPin, Building2, Calendar, Users } from "lucide-react"
import { useState, useEffect } from 'react'
import axios from "axios"
import { useRouter } from "next/navigation"
import { config } from "@/app/config"
import Link from "next/link"

export default function Register() {
  const router = useRouter()
  
  // Form states
  const [location_id, setLocationId] = useState('')
  const [group_location_id, setGroupLocationId] = useState('')
  const [citizen_id, setCitizenId] = useState('')
  const [card_uid, setCardUid] = useState('')
  const [first_name, setFirstName] = useState('')
  const [last_name, setLastName] = useState('')
  const [date_of_birth, setDateOfBirth] = useState('')
  const [religion, setReligion] = useState('')
  const [gender, setGender] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone_number, setPhoneNumber] = useState('')
  const [role_id] = useState('4') // Default role_id to 4 (user)
  const [errors, setErrors] = useState({})
  
  // UI states
  const [loading, setLoading] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // กำหนด interface สำหรับ Location
  interface Location {
    location_id: number;
    location_name: string;
    group_location_id?: number;
  }

  interface GroupLocation {
    group_location_id: number;
    group_location_name: string;
  }

  // ใช้ type annotation
  const [locations, setLocations] = useState<Location[]>([])
  const [groupLocations, setGroupLocations] = useState<GroupLocation[]>([])

  // Dropdown data states
  const [loadingLocations, setLoadingLocations] = useState(true)

  const API_URL = config.apiUrl

  // Fetch locations and group locations on mount

  useEffect(() => {
    fetchGroupLocations()
  }, [])

// ตัวสอง: โหลด Locations เมื่อเลือก Group
  useEffect(() => {
    if (group_location_id) {
      fetchLocationsByGroup(group_location_id)
    } else {
      setLocations([])
      setLocationId('') // รีเซ็ต
    }
  }, [group_location_id])

  const fetchGroupLocations = async () => {
    try {
      setLoadingLocations(true)
      const response = await axios.get(`${API_URL}/grouplocation/getAllGrouplocationforRegister`)
      setGroupLocations(response.data.groupLocations || [])
    } catch (error) {
        console.error('Error fetching group locations:', error)
        setErrorMessage('ไม่สามารถโหลดข้อมูลกลุ่มสถานที่ได้')
        setShowErrorDialog(true)
    } finally {
        setLoadingLocations(false)
    }
  }

  const fetchLocationsByGroup = async (groupId: string) => {
    try {
      setLoadingLocations(true)
      // เรียก API พร้อมส่ง group_location_id เป็น query parameter
      const response = await axios.get(`${API_URL}/location/getLocationsByGroupforRegister`, {
        params: { group_location_id: groupId }
      })
      setLocations(response.data.locations || [])
        // รีเซ็ต location_id เมื่อเปลี่ยน group
        setLocationId('')
    } catch (error) {
        console.error('Error fetching locations:', error)
        setErrorMessage('ไม่สามารถโหลดข้อมูลสถานที่ได้')
        setShowErrorDialog(true)
        setLocations([])
    } finally {
        setLoadingLocations(false)
    }
  }

  const handleRegister = async () => {
    // Validation
    if (!first_name.trim() || !last_name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !location_id || !group_location_id || citizen_id.trim().length === 0 ) {
      setErrorMessage('กรุณากรอกข้อมูลให้ครบ (ชื่อ, นามสกุล, อีเมล, รหัสผ่าน)')
      setShowErrorDialog(true)
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน')
      setShowErrorDialog(true)
      return
    }

    if (password.length < 6) {
      setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      setShowErrorDialog(true)
      return
    }

    if (email && !email.includes('@')) {
      setErrorMessage('รูปแบบอีเมลไม่ถูกต้อง')
      setShowErrorDialog(true)
      return
    }

    if (citizen_id && citizen_id.length !== 13) {
      setErrorMessage('เลขบัตรประชาชนต้องมี 13 หลัก')
      setShowErrorDialog(true)
      return
    }

    setLoading(true)
    
    try {
      const payload = {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        password: password,
        citizen_id: citizen_id.trim() || null,
        card_uid: card_uid.trim() || null,
        religion: religion.trim() || null,
        phone_number: phone_number.trim() || null,
        date_of_birth: date_of_birth || null,
        gender: gender || null,
        location_id: location_id ? parseInt(location_id) : null,
        group_location_id: group_location_id ? parseInt(group_location_id) : null,
        role_id: parseInt(role_id)
      }


      console.log('Sending registration payload:', payload)
      console.log('API URL:', `${API_URL}/auth/register`) // ✅ เพิ่มบรรทัดนี้

      const response = await axios.post(`${API_URL}/auth/register`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })

      console.log('Registration response:', response.data)

      if (response.data) {
        setSuccessMessage('ลงทะเบียนสำเร็จ! กำลังนำคุณไปยังหน้าหลัก...')
        setShowSuccessDialog(true)
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/signin')
        }, 2000)
      }
    } catch (error) {
        console.error('Registration error:', error)
        
        let message = 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่'
        
    
    setErrorMessage(message)
    setShowErrorDialog(true)
    } finally {
        setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRegister()
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
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4 py-8">
        <div className="w-full max-w-2xl space-y-6">
          
          {/* Title Section */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <Users className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">ลงทะเบียนผู้ใช้ใหม่</h2>
          </div>

          {/* Register Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">ข้อมูลส่วนตัว</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Personal Information Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm font-medium">
                    ชื่อ <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="first_name"
                      type="text"
                      placeholder="กรอกชื่อ"
                      value={first_name}
                      onChange={(e) => setFirstName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-sm font-medium">
                    นามสกุล <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="last_name"
                      type="text"
                      placeholder="กรอกนามสกุล"
                      value={last_name}
                      onChange={(e) => setLastName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    อีเมล <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@hospital.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="text-sm font-medium">
                    เบอร์โทรศัพท์
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone_number"
                      type="tel"
                      placeholder="0812345678"
                      value={phone_number}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    รหัสผ่าน <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="กรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Citizen ID */}
                <div className="space-y-2">
                  <Label htmlFor="citizen_id" className="text-sm font-medium">
                    เลขบัตรประชาชน <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="citizen_id"
                    type="text"
                    placeholder="1234567890123"
                    maxLength={13}
                    value={citizen_id}
                    onChange={(e) => setCitizenId(e.target.value.replace(/\D/g, ''))}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                  />
                </div>


                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth" className="text-sm font-medium">
                    วันเกิด
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={date_of_birth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-medium">
                    เพศ
                  </Label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    <option value="">เลือกเพศ</option>
                    <option value="male">ชาย</option>
                    <option value="female">หญิง</option>
                    <option value="other">อื่นๆ</option>
                  </select>
                </div>

                {/* Group Location */}
                <div className="space-y-2">
                  <Label htmlFor="group_location_id" className="text-sm font-medium">
                    กลุ่มสถานที่
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                    <select
                      id="group_location_id"
                      value={group_location_id}
                      onChange={(e) => setGroupLocationId(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading || loadingLocations}
                    >
                      <option value="">เลือกกลุ่มสถานที่</option>
                      {groupLocations.map((group) => (
                        <option key={group.group_location_id} value={group.group_location_id}>
                          {group.group_location_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2" >
                  <Label htmlFor="location_id" className="text-sm font-medium">
                    สถานที่
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                    <select
                      id="location_id"
                      value={location_id}
                      onChange={(e) => setLocationId(e.target.value)}
                      // className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      // if disable change select button to gray with tailwind
                      className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!group_location_id || loading || loadingLocations ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                      disabled={!group_location_id || loading || loadingLocations}
                    >
                      <option value="">เลือกสถานที่</option>
                      {locations.map((loc) => (
                        <option key={loc.location_id} value={loc.location_id}>
                          {loc.location_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                
              </div>

              {/* Register Button */}
              <Button 
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 mt-6"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>กำลังลงทะเบียน...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>ลงทะเบียน</span>
                  </div>
                )}
              </Button>

              <div className="text-sm text-gray-500 text-center">
                มีบัญชีผู้ใช้อยู่แล้ว?{" "}
                <Link href="/signin" className="text-blue-600 hover:underline">
                  เข้าสู่ระบบ
                </Link>
              </div>
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

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>สำเร็จ</AlertDialogTitle>
            <AlertDialogDescription>
              {successMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowSuccessDialog(false)}
              className="bg-green-600 hover:bg-green-700"
            >
              ตกลง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}