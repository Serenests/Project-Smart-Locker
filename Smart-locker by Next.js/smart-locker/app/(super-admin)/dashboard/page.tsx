// app/dashboard/page.tsx
'use client'
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Users, Lock, Activity, MapPin, Wifi, WifiOff, TrendingUp, Building2, PieChart, AlertTriangle, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authService, apiClient } from "@/lib/auth"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  // ✅ State สำหรับ user และ initialization
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const [stats, setStats] = useState({
    total_users: 0,
    total_lockers: 0,
    total_locations: 0,
    total_medications: 0,
    total_slots: 0,
    today_transactions: 0,
    total_transactions: 0,
    online_lockers: 0,
    offline_lockers: 0,
  })

  const [lockerLocations, setLockerLocations] = useState<any[]>([])
  const [transactionChart, setTransactionChart] = useState<any>({ daily: [], monthly: [], yearly: [] })
  const [transactionsByLocation, setTransactionsByLocation] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [lockerStatus, setLockerStatus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartPeriod, setChartPeriod] = useState<"daily" | "monthly" | "yearly">("daily")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [userScope, setUserScope] = useState<any>(null)
  const [chartLoading, setChartLoading] = useState(false)

  // ✅ ฟังก์ชันตรวจสอบ role สำหรับการแสดงผล
  const canShowUserManagement = () => currentUser?.role !== 4
  const canShowProductManagement = () => currentUser?.role === 1 || currentUser?.role === 3
  const canShowLockerManagement = () => currentUser?.role === 1
  const canShowLocationManagement = () => currentUser?.role === 1 || currentUser?.role === 2
  const canShowTransactionHistory = () => currentUser?.role !== 4
  const canShowLockerStatus = () => currentUser?.role === 1 || currentUser?.role === 2 || currentUser?.role === 3

  // ✅ ฟังก์ชันแสดงชื่อ role
  const getRoleName = (role: number) => {
    switch (role) {
      case 1: return 'System Admin'
      case 2: return 'Organize Admin'
      case 3: return 'Department Admin'
      case 4: return 'User'
      default: return 'Unknown'
    }
  }

  // ✅ ฟังก์ชันแสดง scope description
  const getScopeDescription = () => {
    if (!currentUser) return ''
    
    switch (currentUser.role) {
      case 1: 
        return 'คุณกำลังดูข้อมูลทั้งระบบ'
      case 2: 
        return `คุณกำลังดูข้อมูลในกลุ่ม: ${currentUser.groupLocationName || 'ไม่ระบุ'}`
      case 3: 
        return `คุณกำลังดูข้อมูลในหน่วยงาน: ${currentUser.locationName || 'ไม่ระบุ'}`
      default:
        return ''
    }
  }

    useEffect(() => {
      // ตรวจสอบ authentication
      if (!authService.isAuthenticated()) {
        console.log('❌ Not authenticated, redirecting to signin...')
        router.push('/signin')
        return
      }

      const user = authService.getUser()
      
      if (!user || typeof user.role === 'undefined') {
        console.log('❌ Invalid user data, redirecting to signin...')
        router.push('/signin')
        return
      }

      if(user.role === 4) {
        console.log('⚠️ User with role 4 logged in, limited access')
        router.push('/signin') // อาจจะยังอยู่ที่เดิม แต่จะมีการแสดงผลที่จำกัด
      }

      console.log('✅ Current user:', user)
      setCurrentUser(user)
      fetchDashboardData()
    }, []) // ← dependency array ว่าง = ทำครั้งเดียว

    // ✅ useEffect 2: สำหรับ Fetch Chart เมื่อ selectedLocation เปลี่ยน
    useEffect(() => {
      // ต้องรอให้ currentUser โหลดเสร็จก่อน
      if (currentUser && canShowTransactionHistory()) {
        fetchTransactionChart()
      }
    }, [selectedLocation])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('📊 Fetching dashboard data...')

      // ✅ ไม่ต้องส่ง query params - backend จะใช้ข้อมูลจาก token
      const response = await apiClient.get(`${API_URL}/dashboard/stats`)

      console.log('✅ Dashboard data received:', response.data)

      setStats(response.data.stats || stats)
      setLockerLocations(response.data.lockerLocations || [])
      setTransactionChart(response.data.transactionChart || { daily: [], monthly: [], yearly: [] })
      setTransactionsByLocation(response.data.transactionsByLocation || [])
      setRecentTransactions(response.data.recentTransactions || [])
      setLockerStatus(response.data.lockerStatus || [])
      setUserScope(response.data.userScope || null)

    } catch (error: any) {
      console.error("❌ Error fetching dashboard data:", error)
      setError(error.response?.data?.message || 'ไม่สามารถโหลดข้อมูลได้')
      
      if (error.response?.status === 401) {
        router.push('/signin')
      }
    } finally {
      setLoading(false)
      setIsInitializing(false)
    }
  }

  // ✅ ฟังก์ชันใหม่: ดึงข้อมูล transaction chart ตาม location
  const fetchTransactionChart = async () => {
    try {
      setChartLoading(true)
      
      const locationParam = selectedLocation === 'all' 
        ? '' 
        : `?location_id=${selectedLocation}`
      
      console.log('📊 Fetching transaction chart for location:', selectedLocation)
      
      const response = await apiClient.get(
        `${API_URL}/dashboard/transactionChart${locationParam}`
      )
      
      setTransactionChart(response.data.transactionChart || { 
        daily: [], 
        monthly: [], 
        yearly: [] 
      })
      
      console.log('✅ Transaction chart updated for location:', selectedLocation)
      console.log('👥 Users in scope:', response.data.user_count)
      
    } catch (error: any) {
      console.error('❌ Error fetching transaction chart:', error)
      // ไม่ต้อง set error เพราะจะทำให้ UI แสดง error ทั้งหน้า
      setTransactionChart({ daily: [], monthly: [], yearly: [] })
    } finally {
      setChartLoading(false)
    }
  }

  // ✅ สร้าง statsCards แบบ dynamic ตาม role
  const getStatsCards = () => {
    const allCards = [
      {
        title: "ตู้ล็อคเกอร์",
        value: stats.total_lockers,
        icon: Lock,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        link: "/locker-management",
        visible: canShowLockerManagement(),
      },
      {
        title: "สถานที่",
        value: stats.total_locations,
        icon: MapPin,
        color: "text-green-600",
        bgColor: "bg-green-50",
        link: "/location-management",
        visible: canShowLocationManagement(),
      },
      {
        title: "รายการยา",
        value: stats.total_medications,
        icon: Package,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
        link: "/product-management",
        visible: canShowProductManagement(),
      },
      {
        title: "ผู้ใช้",
        value: stats.total_users,
        icon: Users,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        link: "/user-management",
        visible: canShowUserManagement(),
      },
    ]

    return allCards.filter(card => card.visible)
  }

  const getActivityBadge = (activity: string) => {
    return activity === "เบิกยา" 
      ? <Badge variant="default" className="bg-blue-600">เบิกยา</Badge> 
      : <Badge variant="secondary" className="bg-purple-600 text-white">เติมยา</Badge>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'สำเร็จ':
        return <Badge className="bg-green-100 text-green-800">สำเร็จ</Badge>
      case 'รอดำเนินการ':
        return <Badge className="bg-yellow-100 text-yellow-800">รอดำเนินการ</Badge>
      case 'ยกเลิก':
        return <Badge className="bg-red-100 text-red-800">ยกเลิก</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // ✅ Loading state
  if (isInitializing || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล Dashboard...</p>
        </div>
      </div>
    )
  }

  const currentChartData = transactionChart[chartPeriod] || []
  const statsCards = getStatsCards()

  return (
    <div className="flex-1 space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ภาพรวมระบบ</h2>
          <p className="text-muted-foreground">
            สรุปข้อมูลและสถิติการใช้งานระบบตู้ล็อคเกอร์ยาควบคุม
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchDashboardData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">เกิดข้อผิดพลาด</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchDashboardData}
                className="ml-auto text-red-600 border-red-300 hover:bg-red-100"
              >
                ลองอีกครั้ง
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards - แสดงตาม role */}
      {statsCards.length > 0 && (
        <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-${Math.min(statsCards.length, 4)}`}>
          {statsCards.map((stat, index) => (
            <Link key={index} href={stat.link}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                    </div>
                    <div className={`rounded-full p-3 ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Transaction Stats - แสดงสำหรับทุก role ที่มีสิทธิ์ */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaction วันนี้</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today_transactions}</div>
            <p className="text-xs text-muted-foreground">การเบิก-จ่ายวันนี้</p>
          </CardContent>
        </Card>

        {/* แสดงเฉพาะ role ที่มีสิทธิ์ */}
        {canShowTransactionHistory() ? (
          <Link href="/transaction">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transaction ทั้งหมด</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_transactions}</div>
                <p className="text-xs text-muted-foreground">
                  {currentUser.role === 1 ? 'รายการทั้งหมดในระบบ' : 'รายการในขอบเขตของคุณ'}
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transaction ทั้งหมด</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_transactions}</div>
              <p className="text-xs text-muted-foreground">รายการทั้งหมดในระบบ</p>
            </CardContent>
          </Card>
        )}

        {/* ✅ ตู้ออนไลน์ */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ตู้ออนไลน์</CardTitle>
            <Wifi className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">{stats.online_lockers}</span>
              <span className="text-gray-400">/</span>
              <span className="text-2xl font-bold">{stats.total_lockers}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">ตู้ที่ทำงานปกติ</p>
              {stats.offline_lockers > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.offline_lockers} ออฟไลน์
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Locker Status Section - แสดงตาม role */}
      {canShowLockerStatus() && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                แผนที่ตู้ล็อคเกอร์
              </CardTitle>
              <CardDescription>
                ตำแหน่งตู้ล็อคเกอร์ที่ติดตั้ง
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-[300px] bg-gray-100 rounded-lg overflow-hidden">
                <div className="absolute inset-0 p-4 overflow-y-auto">
                  {lockerLocations.length > 0 ? (
                    <div className="space-y-2">
                      {lockerLocations.map((location) => (
                        <div
                          key={location.locker_id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className={`h-4 w-4 ${location.status === 'online' ? 'text-green-600' : 'text-red-600'}`} />
                            <div>
                              <p className="font-medium text-sm">{location.location_name}</p>
                              <p className="text-xs text-gray-500">
                                {location.latitude && location.longitude 
                                  ? `${location.latitude}, ${location.longitude}`
                                  : 'ไม่ระบุพิกัด'}
                              </p>
                            </div>
                          </div>
                          <Badge variant={location.status === "online" ? "outline" : "destructive"}>
                            {location.locker_ip}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>ไม่มีข้อมูลตำแหน่งตู้</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Locker Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                สถานะตู้ล็อคเกอร์
              </CardTitle>
              <CardDescription>
                สถานะการเชื่อมต่อของตู้
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {lockerStatus.length > 0 ? (
                  lockerStatus.map((locker) => (
                    <div key={locker.locker_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {locker.status === "online" ? (
                          <Wifi className="h-4 w-4 text-green-600" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{locker.locker_ip}</p>
                          <p className="text-xs text-gray-500">{locker.location_name}</p>
                        </div>
                      </div>
                      <Badge
                        variant={locker.status === "online" ? "outline" : "destructive"}
                        className={locker.status === "online" ? "text-green-600 border-green-600" : ""}
                      >
                        {locker.status === "online" ? "ออนไลน์" : "ออฟไลน์"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Wifi className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>ไม่มีข้อมูลสถานะตู้</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction Chart - แสดงเฉพาะ role ที่มีสิทธิ์ */}
      {canShowTransactionHistory() && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    กราฟ Transaction
                    {chartLoading && (
                      <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    สถิติการเบิก-จ่ายยา
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select 
                    value={selectedLocation} 
                    onValueChange={setSelectedLocation}
                    disabled={chartLoading}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="เลือกสถานที่" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกสถานที่</SelectItem>
                      {transactionsByLocation.map((loc) => (
                        <SelectItem 
                          key={loc.location_id} 
                          value={loc.location_id?.toString() || loc.location}
                        >
                          {loc.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs 
                value={chartPeriod} 
                onValueChange={(value: any) => setChartPeriod(value)}
              >
                <TabsList className="grid w-full max-w-md grid-cols-3">
                  <TabsTrigger value="daily" disabled={chartLoading}>
                    รายวัน
                  </TabsTrigger>
                  <TabsTrigger value="monthly" disabled={chartLoading}>
                    รายเดือน
                  </TabsTrigger>
                  <TabsTrigger value="yearly" disabled={chartLoading}>
                    รายปี
                  </TabsTrigger>
                </TabsList>
                <TabsContent value={chartPeriod} className="mt-6">
                  {chartLoading ? (
                    <div className="h-[350px] flex items-center justify-center">
                      <div className="text-center">
                        <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-600" />
                        <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                      </div>
                    </div>
                  ) : currentChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={currentChartData}>
                        <XAxis
                          dataKey={
                            chartPeriod === "daily" 
                              ? "date" 
                              : chartPeriod === "monthly" 
                              ? "month" 
                              : "year"
                          }
                          stroke="#888888"
                          fontSize={12}
                        />
                        <YAxis stroke="#888888" fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          dataKey="withdraw" 
                          fill="#3b82f6" 
                          name="เบิกยา" 
                          radius={[4, 4, 0, 0]} 
                        />
                        <Bar 
                          dataKey="restock" 
                          fill="#8b5cf6" 
                          name="เติมยา" 
                          radius={[4, 4, 0, 0]} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <PieChart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>ไม่มีข้อมูล Transaction</p>
                        {selectedLocation !== 'all' && (
                          <p className="text-sm mt-2 text-gray-400">
                            ในสถานที่ที่เลือก
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {/* ✅ สำหรับ User (Role 4) - แสดงข้อความแจ้ง */}
      {currentUser.role === 4 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              คุณไม่มีสิทธิ์เข้าถึงข้อมูลบางส่วน
            </h3>
            <p className="text-gray-500 mb-4">
              ในฐานะผู้ใช้ทั่วไป คุณสามารถใช้งานตู้ล็อคเกอร์ได้ผ่านอุปกรณ์ที่ติดตั้ง
            </p>
            <p className="text-sm text-gray-400">
              หากต้องการสิทธิ์เพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}