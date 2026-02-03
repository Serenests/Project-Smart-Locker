'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Edit, Trash2, AlertTriangle, Package, KeyRound, Eye, Box, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { authService, apiClient } from "@/lib/auth"

export default function LockerManagementPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  const router = useRouter()
  
  // เพิ่ม state สำหรับเก็บ current user
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  
  const [lockers, setLockers] = useState<any[]>([])
  const [lockersWithoutProvision, setLockersWithoutProvision] = useState<any[]>([]) // เพิ่ม state ใหม่
  const [provisions, setProvisions] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchProvisionTerm, setSearchProvisionTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProvisions, setIsLoadingProvisions] = useState(false)
  
  
  // Locker Dialogs
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedLocker, setSelectedLocker] = useState<any>(null)
  const [lockerToDelete, setLockerToDelete] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [createFormLoading, setCreateFormLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  // Provision Dialogs
  const [isAddProvisionDialogOpen, setIsAddProvisionDialogOpen] = useState(false)
  const [isEditProvisionDialogOpen, setIsEditProvisionDialogOpen] = useState(false)
  const [isDeleteProvisionDialogOpen, setIsDeleteProvisionDialogOpen] = useState(false)
  const [selectedProvision, setSelectedProvision] = useState<any>(null)
  const [provisionToDelete, setProvisionToDelete] = useState<any>(null)
  const [createProvisionLoading, setCreateProvisionLoading] = useState(false)
  const [editProvisionLoading, setEditProvisionLoading] = useState(false)
  const [deleteProvisionLoading, setDeleteProvisionLoading] = useState(false)

  const [isLockerhaveProvisionDialogOpen, setIsLockerhaveProvisionDialogOpen] = useState(false)

  // Slot Management States
  const [isViewSlotsDialogOpen, setIsViewSlotsDialogOpen] = useState(false)
  const [selectedLockerForSlots, setSelectedLockerForSlots] = useState<any>(null)
  const [slots, setSlots] = useState<any[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isAddSlotDialogOpen, setIsAddSlotDialogOpen] = useState(false)
  const [isEditSlotDialogOpen, setIsEditSlotDialogOpen] = useState(false)
  const [isDeleteSlotDialogOpen, setIsDeleteSlotDialogOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [slotToDelete, setSlotToDelete] = useState<any>(null)
  const [createSlotLoading, setCreateSlotLoading] = useState(false)
  const [editSlotLoading, setEditSlotLoading] = useState(false)
  const [deleteSlotLoading, setDeleteSlotLoading] = useState(false)

  const [createForm, setCreateForm] = useState({
    location_id: "",
    locker_location_detail: "",
  })

  const [createProvisionForm, setCreateProvisionForm] = useState({
    locker_id: "",
    provision_code: "",
    expires_at: "",
  })

  const [editForm, setEditForm] = useState({
    location_id: "",
    locker_location_detail: "",
  })

  const [editProvisionForm, setEditProvisionForm] = useState({
    expires_at: "",
  })

  const [createSlotForm, setCreateSlotForm] = useState({
    capacity: "",
  })

  const [editSlotForm, setEditSlotForm] = useState({
    capacity: "",
  })

  useEffect(() => {
    // ตรวจสอบ authentication
    if (!authService.isAuthenticated()) {
      console.log('❌ Not authenticated, redirecting to signin...');
      router.push('/signin');
      return;
    }
    
    const user = authService.getUser()
    
    // เช็คว่า user object มีค่าและมี role
    if (!user || typeof user.role === 'undefined') {
      console.log('❌ Invalid user data, redirecting to signin...');
      router.push('/signin');
      return;
    }
    
    // เก็บ user ใน state
    setCurrentUser(user)
    
    if (user.role === 4) {
      router.push('/dashboard');
      return;
    }

    // Create AbortController for cancellation
    const abortController = new AbortController()

    // Fetch data based on role
    const fetchData = async () => {
      try {
        const promises = [
          fetchLockers(),
          fetchLocations()
        ];

        // Fetch provisions only for System Admin (role 1)
        if (user.role === 1) {
          promises.push(fetchProvisions());
          promises.push(fetchLockersDontHaveProvision()); // เพิ่มบรรทัดนี้
        }

        await Promise.all(promises);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    fetchData();

    // Cleanup function to cancel requests on unmount
    return () => {
      abortController.abort()
    }
  }, [])

  const fetchLockers = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const user = authService.getUser()

       // เพิ่มการตรวจสอบค่าที่จำเป็น
    console.log('🔍 Fetching lockers for user:', {
      role: user.role,
      groupLocationId: user.groupLocationId,
      locationId: user.locationId
    })
      let response

      // เรียก API ตาม role
      if (user.role === 1) {
        // System Admin - เห็นทั้งหมด
        response = await apiClient.get(`${API_URL}/locker/getAllLockers`)
        

      } else if (user.role === 2) {
        // Organize Admin - เห็นตาม group_location_id
        response = await apiClient.get(`${API_URL}/locker/getLockerByGroupLocationId/${user.groupLocationId}`)

      } else if (user.role === 3) {
        // Department Admin - เห็นตาม location_id
        response = await apiClient.get(`${API_URL}/locker/getLockersByLocationId/${user.locationId}`)
      } else {
        // Role อื่นๆ ไม่มีสิทธิ์
        setLockers([])
        return
      }

      // จัดการข้อมูลที่ได้รับ
      let lockersData = []
      
      if (response.data.lockers) {
        lockersData = response.data.lockers
      } else if (response.data.locker) {
        lockersData = Array.isArray(response.data.locker) 
          ? response.data.locker 
          : [response.data.locker]
      }

      console.log('Fetched lockers:', lockersData)
      setLockers(Array.isArray(lockersData) ? lockersData : [])

    } catch (error: any) {
      console.error('Fetch lockers error:', error)
      
      // จัดการ error แบบเฉพาะเจาะจง
      if (error.response?.status === 403) {
        setError('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
      } else if (error.response?.status === 404) {
        setError('ไม่พบข้อมูลล็อกเกอร์')
        setLockers([])
      } else {
        setError('ไม่สามารถดึงข้อมูลล็อกเกอร์ได้')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLockersDontHaveProvision = async () => {
    try {
      setError(null)
      const response = await apiClient.get(`${API_URL}/locker/getLockerDontHaveProvision`)

      if (response.status === 200) {
        const lockersData = response.data.lockers || []
        console.log('Fetched lockers without provision:', lockersData)
        setLockersWithoutProvision(Array.isArray(lockersData) ? lockersData : [])
      }
    } catch (error: any) {
      console.error('Fetch lockers without provision error:', error)
      if (error.response?.status === 404) {
        // ไม่มี locker ที่ยังไม่ได้จัดสรร - ไม่ใช่ error
        setLockersWithoutProvision([])
      } else {
        setError('ไม่สามารถดึงข้อมูลล็อกเกอร์ที่ยังไม่มีการจัดสรรได้')
      }
    }
  }

  const fetchProvisions = async () => {
    try {
      setIsLoadingProvisions(true)
      const response = await apiClient.get(`${API_URL}/lockerProvision/getAllProvisions`)
      console.log('Fetched provisions:', response.data.provisions)

      setProvisions(Array.isArray(response.data.provisions) ? response.data.provisions : [])

    } catch (error) {
      console.error('Fetch provisions error:', error)
    } finally {
      setIsLoadingProvisions(false)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await apiClient.get(`${API_URL}/location/getAllLocations`)
      setLocations(Array.isArray(response.data.locations) ? response.data.locations : [])

    } catch (error) {
      console.error('Fetch locations error:', error)
    }
  }

  // ===== SLOT FUNCTIONS =====
  const fetchSlotsByLockerId = async (lockerId: string) => {
    try {
      setIsLoadingSlots(true)
      const response = await apiClient.get(`${API_URL}/slot/getSlotsByLockerId/${lockerId}`)

      setSlots(Array.isArray(response.data.slots) ? response.data.slots : [])

    } catch (error: any) {
      console.error('Fetch slots error:', error)
      setError(error.message || 'ไม่สามารถดึงข้อมูล Slot ได้')
    } finally {
      setIsLoadingSlots(false)
    }
  }

  const handleViewSlots = async (locker: any) => {
    setSelectedLockerForSlots(locker)
    setIsViewSlotsDialogOpen(true)
    await fetchSlotsByLockerId(locker.locker_id)
  }

  const handleOpenCreateSlotDialog = () => {
    setIsAddSlotDialogOpen(true)
    setCreateSlotForm({ capacity: "" })
  }

  const handleSubmitCreateSlot = async () => {
    if (!selectedLockerForSlots) return

    try {
      setCreateSlotLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/slot/createSlot`, {
        locker_id: selectedLockerForSlots.locker_id,
        location_id: selectedLockerForSlots.location_id,
        capacity: parseInt(createSlotForm.capacity)
      })

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถสร้าง Slot ได้')
      }

      await fetchSlotsByLockerId(selectedLockerForSlots.locker_id)
      setIsAddSlotDialogOpen(false)
      setCreateSlotForm({ capacity: "" })

    } catch (error: any) {
      console.error('Error creating slot:', error)
      setError(error.message || 'เกิดข้อผิดพลาดในการสร้าง Slot')
    } finally {
      setCreateSlotLoading(false)
    }
  }

  const handleEditSlot = (slot: any) => {
    setSelectedSlot(slot)
    setEditSlotForm({
      capacity: slot.capacity?.toString() || "",
    })
    setIsEditSlotDialogOpen(true)
  }

  const handleSubmitEditSlot = async () => {
    if (!selectedSlot || !selectedLockerForSlots) return

    try {
      setEditSlotLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/slot/updateSlot`, {
        slot_id: selectedSlot.slot_id,
        capacity: parseInt(editSlotForm.capacity),
      })

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถแก้ไขข้อมูลได้')
      }

      await fetchSlotsByLockerId(selectedLockerForSlots.locker_id)
      setIsEditSlotDialogOpen(false)

    } catch (error: any) {
      console.error("Error editing slot:", error)
      setError(error.message || 'เกิดข้อผิดพลาดในการแก้ไข Slot')
    } finally {
      setEditSlotLoading(false)
    }
  }

  const handleDeleteSlot = async () => {
    if (!slotToDelete || !selectedLockerForSlots) return

    try {
      setDeleteSlotLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/slot/deleteSlot`, {
        slot_id: slotToDelete.slot_id
      })

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถลบ Slot ได้')
      }

      await fetchSlotsByLockerId(selectedLockerForSlots.locker_id)
      setIsDeleteSlotDialogOpen(false)
      setSlotToDelete(null)

    } catch (error: any) {
      console.error("Error deleting slot:", error)
      setError(error.message || 'เกิดข้อผิดพลาดในการลบ Slot')
    } finally {
      setDeleteSlotLoading(false)
    }
  }

  const confirmDeleteSlot = (slot: any) => {
    setSlotToDelete(slot)
    setIsDeleteSlotDialogOpen(true)
  }

  // Filter lockers for search only (backend already filtered by role)
  const filteredLockers = lockers.filter(
    (locker) =>
      locker.locker_id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      locker.Location?.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locker.locker_location_detail?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProvisions = provisions.filter(
    (provision) =>
      provision.provision_code?.toString().toLowerCase().includes(searchProvisionTerm.toLowerCase()) ||
      provision.locker_id?.toString().toLowerCase().includes(searchProvisionTerm.toLowerCase()) ||
      provision.location_name?.toString().toLowerCase().includes(searchProvisionTerm.toLowerCase()) ||
      provision.locker_location_detail?.toString().toLowerCase().includes(searchProvisionTerm.toLowerCase()) ||
      provision.provision_id?.toString().toLowerCase().includes(searchProvisionTerm.toLowerCase())
  )

  // Locker functions
  const handleOpenCreateDialog = () => {
    setIsAddDialogOpen(true)
    setCreateForm({ 
      location_id: "", 
      locker_location_detail: "",
    })
  }

  const handleSubmitCreateLocker = async () => {
    try {
      setCreateFormLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/locker/createLocker`, createForm)

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถสร้างล็อกเกอร์ได้')
      }

      await fetchLockers()
      setIsAddDialogOpen(false)
      setCreateForm({
        location_id: "",
        locker_location_detail: "",
      })

    } catch (error: any) {
      console.error('Error creating locker:', error)
      setError(error.message || 'เกิดข้อผิดพลาดในการสร้างล็อกเกอร์')
    } finally {
      setCreateFormLoading(false)
    }
  }

  const handleEditLocker = (locker: any) => {
    setSelectedLocker(locker)
    setEditForm({
      location_id: locker.location_id || "",
      locker_location_detail: locker.locker_location_detail || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleSubmitEdit = async () => {
    if (!selectedLocker) return

    try {
      setEditLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/locker/updateLocker`, {
        locker_id: selectedLocker.locker_id,
        locker_location_detail: editForm.locker_location_detail,
      })

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถแก้ไขข้อมูลได้')
      }

      await fetchLockers()
      setIsEditDialogOpen(false)

    } catch (error: any) {
      console.error("Error editing locker:", error)
      setError(error.message || 'เกิดข้อผิดพลาดในการแก้ไขล็อกเกอร์')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteLocker = async () => {
    if (!lockerToDelete) return

    try {
      setDeleteLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/locker/deleteLocker`, {
        locker_id: lockerToDelete.locker_id
      })

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถลบล็อกเกอร์ได้')
      }

      await fetchLockers()
      setIsDeleteDialogOpen(false)
      setLockerToDelete(null)

    } catch (error: any) {
      console.error("Error deleting locker:", error)
      setError(error.message || 'เกิดข้อผิดพลาดในการลบล็อกเกอร์')
    } finally {
      setDeleteLoading(false)
    }
  }

  const confirmDeleteLocker = (locker: any) => {
    setLockerToDelete(locker)
    setIsDeleteDialogOpen(true)
  }

  // ===== PROVISION FUNCTIONS =====
  const handleOpenCreateProvisionDialog = async () => {
    setIsAddProvisionDialogOpen(true)
    setCreateProvisionForm({ locker_id: "", provision_code: "", expires_at: "" })
    // Refresh lockers without provision when opening dialog
    await fetchLockersDontHaveProvision()
  }

  const handleSubmitCreateProvision = async () => {
    try {
      setCreateProvisionLoading(true)
      setError(null)

      const payload = {
        ...createProvisionForm,
        expires_at: createProvisionForm.expires_at
          ? new Date(createProvisionForm.expires_at).toISOString()
          : undefined
      }

      const response = await apiClient.post(`${API_URL}/lockerProvision/createProvision`, payload)

      if (response.status !== 200 && response.status !== 201) {
        setIsLockerhaveProvisionDialogOpen(true)
        throw new Error(response.data?.message || 'ล็อกเกอร์นี้มีการจัดสรรอยู่แล้ว')
      }

      await fetchProvisions()
      await fetchLockersDontHaveProvision() // เพิ่มบรรทัดนี้
      setIsAddProvisionDialogOpen(false)
      setCreateProvisionForm({ locker_id: "", provision_code: "", expires_at: "" })

    } catch (error: any) {
      console.error('Error creating provision:', error)
      setError(error.message || 'เกิดข้อผิดพลาดในการสร้างการจัดสรร')
    } finally {
      setCreateProvisionLoading(false)
    }
  }
  
  
  const handleEditProvision = (provision: any) => {
    setSelectedProvision(provision)
    
    let localDateTime = ""
    if (provision.expires_at) {
      const date = new Date(provision.expires_at)
      localDateTime = date.toISOString().slice(0, 16)
    }
    
    setEditProvisionForm({
      expires_at: localDateTime,
    })
    setIsEditProvisionDialogOpen(true)
  }

  const handleSubmitEditProvision = async () => {
    if (!selectedProvision) return

    try {
      setEditProvisionLoading(true)
      setError(null)

      const payload = {
        provision_id: selectedProvision.provision_id,
        expires_at: editProvisionForm.expires_at
          ? new Date(editProvisionForm.expires_at).toISOString()
          : undefined
      }

      const response = await apiClient.post(`${API_URL}/lockerProvision/updateProvision`, payload)

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถแก้ไขข้อมูลได้')
      }

      await fetchProvisions()
      setIsEditProvisionDialogOpen(false)

    } catch (error: any) {
      console.error("Error editing provision:", error)
      setError(error.message || 'เกิดข้อผิดพลาดในการแก้ไขการจัดสรร')
    } finally {
      setEditProvisionLoading(false)
    }
  }

  const handleDeleteProvision = async () => {
    if (!provisionToDelete) return

    try {
      setDeleteProvisionLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/lockerProvision/deleteProvision`, {
        provision_id: provisionToDelete.provision_id
      })

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถลบการจัดสรรได้')
      }

      await fetchProvisions()
      await fetchLockersDontHaveProvision() // เพิ่มบรรทัดนี้
      setIsDeleteProvisionDialogOpen(false)
      setProvisionToDelete(null)

    } catch (error: any) {
      console.error("Error deleting provision:", error)
      setError(error.message || 'เกิดข้อผิดพลาดในการลบการจัดสรร')
    } finally {
      setDeleteProvisionLoading(false)
    }
  }

  const confirmDeleteProvision = (provision: any) => {
    setProvisionToDelete(provision)
    setIsDeleteProvisionDialogOpen(true)
  }

  // แสดง loading state หากยังไม่มี currentUser หรือกำลัง initializing
  if (isInitializing || !currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">จัดการล็อกเกอร์</h2>
          <p className="text-muted-foreground">จัดการรายการล็อกเกอร์และการลงทะเบียนล็อกเกอร์</p>
        </div>
      </div>

      <Tabs defaultValue="lockers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lockers" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            ล็อกเกอร์
          </TabsTrigger>
          {currentUser?.role === 1 && (
            <TabsTrigger value="provisions" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              จัดการการลงทะเบียนล็อกเกอร์
            </TabsTrigger>
          )}  
        </TabsList>

        {/* LOCKERS TAB */}
        <TabsContent value="lockers" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาล็อกเกอร์, สถานที่, รายละเอียด"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              /> 
            </div>
            {currentUser?.role === 1 && (
              <Button className="bg-gray-800 hover:bg-gray-900" onClick={handleOpenCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มล็อกเกอร์
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>รายการล็อกเกอร์ในระบบ</CardTitle>
              <CardDescription>จำนวนทั้งหมด {filteredLockers.length} ล็อกเกอร์</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">เกิดข้อผิดพลาด</h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                      <button
                        onClick={fetchLockers}
                        className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                      >
                        ลองอีกครั้ง
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800 mx-auto mb-4"></div>
                  <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
              ) : filteredLockers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบล็อกเกอร์</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? "ไม่พบล็อกเกอร์ในระบบที่ตรงกับการค้นหา"
                      : "ยังไม่มีล็อกเกอร์ในระบบ กรุณาเพิ่มล็อกเกอร์"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัสล็อกเกอร์</TableHead>
                      <TableHead>สถานที่</TableHead>
                      <TableHead>รายละเอียดตำแหน่ง</TableHead>
                      <TableHead>ดูข้อมูลในล็อกเกอร์</TableHead>
                      {currentUser?.role === 1 && (
                        <TableHead>การจัดการ</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLockers.map((locker) => (
                      <TableRow key={locker.locker_id}>
                        <TableCell className="font-mono text-sm">
                          {locker.locker_id || "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {locker.Location?.location_name || "-"}
                        </TableCell>
                        <TableCell>{locker.locker_location_detail || "-"}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewSlots(locker)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            ดูช่องเก็บของ
                          </Button>
                        </TableCell>
                        {currentUser?.role === 1 && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditLocker(locker)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => confirmDeleteLocker(locker)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROVISIONS TAB */}
        {currentUser?.role === 1 && (
          <TabsContent value="provisions" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="ค้นหาการจัดสรร, รหัสจัดสรร"
                  value={searchProvisionTerm}
                  onChange={(e) => setSearchProvisionTerm(e.target.value)}
                  className="pl-10"
                /> 
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenCreateProvisionDialog}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มการลงทะเบียนล็อกเกอร์
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>รายการการให้สิทธิ์ล็อกเกอร์</CardTitle>
                <CardDescription>จำนวนทั้งหมด {filteredProvisions.length} การให้สิทธิ์</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProvisions ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                  </div>
                ) : filteredProvisions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
                      <KeyRound className="h-8 w-8 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบการจัดสรร</h3>
                    <p className="text-gray-500 mb-4">
                      {searchProvisionTerm
                        ? "ไม่พบการจัดสรรในระบบที่ตรงกับการค้นหา"
                        : "ยังไม่มีการจัดสรรล็อกเกอร์ในระบบ กรุณาเพิ่มการจัดสรร"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัสการจัดสรร</TableHead>
                        <TableHead>รหัสล็อกเกอร์</TableHead>
                        <TableHead>สถานที่</TableHead>
                        <TableHead>รายละเอียดสถานที่</TableHead>
                        <TableHead>รหัสจัดสรร</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead className="text-right">การจัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProvisions.map((provision) => (
                        <TableRow key={provision.provision_id}>
                          <TableCell className="font-mono text-sm">
                            {provision.provision_id}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {provision.locker_id}
                          </TableCell>
                          <TableCell className="font-medium">
                            {provision.Locker?.Location?.location_name}
                          </TableCell>
                          <TableCell className="font-medium">
                            {provision.Locker?.locker_location_detail}
                          </TableCell>
                          <TableCell className="font-medium">
                            {provision.provision_code}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              provision.is_activated 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {provision.is_activated ? 'ใช้งานแล้ว' : 'ยังไม่ใช้งาน'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEditProvision(provision)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => confirmDeleteProvision(provision)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ===== VIEW SLOTS DIALOG ===== */}
      <Dialog open={isViewSlotsDialogOpen} onOpenChange={setIsViewSlotsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              ช่องเก็บของในล็อกเกอร์ {selectedLockerForSlots?.locker_id}
            </DialogTitle>
            <DialogDescription>
              สถานที่: {selectedLockerForSlots?.Location?.location_name} - {selectedLockerForSlots?.locker_location_detail}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                จำนวนช่องทั้งหมด: {slots.length} ช่อง
              </p>
              {currentUser?.role === 1 && (
                <Button onClick={handleOpenCreateSlotDialog} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มช่องใหม่
                </Button>
              )}
            </div>

            {isLoadingSlots ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800 mx-auto mb-4"></div>
                <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Box className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีช่องเก็บของ</h3>
                <p className="text-gray-500 mb-4">เริ่มต้นด้วยการเพิ่มช่องเก็บของใหม่</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {slots.map((slot) => (
                  <Card key={slot.slot_id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Box className="h-4 w-4" />
                          Slot #{slot.slot_id}
                        </CardTitle>
                        {currentUser?.role === 1 && (
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditSlot(slot)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => confirmDeleteSlot(slot)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        ความจุ: {slot.capacity} หน่วย
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {!slot.Slot_stock || slot.Slot_stock.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-md flex items-center justify-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          ไม่มีสินค้าในช่อง
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-gray-700 uppercase">สินค้าในช่อง:</p>
                          {slot.Slot_stock.map((stock: any) => (
                            <div 
                              key={stock.slot_stock_id} 
                              className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {stock.Product?.product_name || "ไม่ระบุชื่อ"}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Lot: {stock.lot_id}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {stock.amount} ชิ้น
                                </Badge>
                              </div>
                              {stock.expired_at && (
                                <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                  <p className="text-xs text-gray-600">
                                    หมดอายุ: {new Date(stock.expired_at).toLocaleDateString('th-TH', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewSlotsDialogOpen(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ADD SLOT DIALOG ===== */}
      <Dialog open={isAddSlotDialogOpen} onOpenChange={setIsAddSlotDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เพิ่มช่องเก็บของใหม่</DialogTitle>
            <DialogDescription>
              เพิ่มช่องเก็บของในล็อกเกอร์ {selectedLockerForSlots?.locker_id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="create_slot_capacity">ความจุ (หน่วย) *</Label>
              <Input
                id="create_slot_capacity"
                type="number"
                min="1"
                value={createSlotForm.capacity}
                onChange={(e) => setCreateSlotForm({capacity: e.target.value})}
                placeholder="เช่น 10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddSlotDialogOpen(false)
                setCreateSlotForm({ capacity: "" })
              }}
              disabled={createSlotLoading}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSubmitCreateSlot}
              disabled={createSlotLoading || !createSlotForm.capacity}
            >
              {createSlotLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังบันทึก...</span>
                </div>
              ) : (
                'บันทึกข้อมูล'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT SLOT DIALOG ===== */}
      <Dialog open={isEditSlotDialogOpen} onOpenChange={setIsEditSlotDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>แก้ไขช่องเก็บของ</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูล Slot #{selectedSlot?.slot_id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit_slot_capacity">ความจุ (หน่วย) *</Label>
              <Input
                id="edit_slot_capacity"
                type="number"
                min="1"
                value={editSlotForm.capacity}
                onChange={(e) => setEditSlotForm({capacity: e.target.value})}
                placeholder="เช่น 10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditSlotDialogOpen(false)}
              disabled={editSlotLoading}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSubmitEditSlot}
              disabled={editSlotLoading || !editSlotForm.capacity}
            >
              {editSlotLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังบันทึก...</span>
                </div>
              ) : (
                'บันทึกการแก้ไข'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE SLOT CONFIRMATION ===== */}
      <AlertDialog open={isDeleteSlotDialogOpen} onOpenChange={setIsDeleteSlotDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบช่องเก็บของ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบ Slot #{slotToDelete?.slot_id} ใช่หรือไม่?
              <br />
              <span className="text-red-600 text-sm mt-2 block">
                ⚠️ การลบจะส่งผลต่อข้อมูลสินค้าที่เก็บอยู่ในช่องนี้
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteSlotDialogOpen(false)
                setSlotToDelete(null)
              }}
              disabled={deleteSlotLoading}
            >
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSlot}
              disabled={deleteSlotLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteSlotLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังลบ...</span>
                </div>
              ) : (
                'ลบช่องเก็บของ'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* LOCKER DIALOGS */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบล็อกเกอร์</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบล็อกเกอร์{" "}
              <span className="font-semibold text-gray-900">
                {lockerToDelete?.locker_id}
              </span>
              {" "}ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setLockerToDelete(null)
              }}
              disabled={deleteLoading}
            >
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocker}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังลบ...</span>
                </div>
              ) : (
                'ลบล็อกเกอร์'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มล็อกเกอร์</DialogTitle>
            <DialogDescription>
              เพิ่มข้อมูลของล็อกเกอร์ใหม่ในระบบ
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="create_location_id">สถานที่ *</Label>
                <Select
                  value={createForm.location_id}
                  onValueChange={(value) => setCreateForm({...createForm, location_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสถานที่" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.location_id} value={location.location_id}>
                        {location.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create_locker_location_detail">รายละเอียดตำแหน่ง *</Label>
                <Input
                  id="create_locker_location_detail"
                  value={createForm.locker_location_detail}
                  onChange={(e) => setCreateForm({...createForm, locker_location_detail: e.target.value})}
                  placeholder="เช่น ชั้น 1 ข้างห้องน้ำ"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false)
                setCreateForm({ 
                  location_id: "", 
                  locker_location_detail: "",
                })
              }}
              disabled={createFormLoading}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSubmitCreateLocker}
              disabled={createFormLoading || !createForm.location_id || !createForm.locker_location_detail}
              className="bg-gray-800"
            >
              {createFormLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังบันทึก...</span>
                </div>
              ) : (
                'บันทึกข้อมูล'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขล็อกเกอร์</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลของล็อกเกอร์ {selectedLocker?.locker_id}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="edit_locker_location_detail">รายละเอียดตำแหน่ง *</Label>
                <Input
                  id="edit_locker_location_detail"
                  value={editForm.locker_location_detail}
                  onChange={(e) => setEditForm({...editForm, locker_location_detail: e.target.value})}
                  placeholder="เช่น ชั้น 1 ข้างห้องน้ำ"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              disabled={editLoading}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSubmitEdit}
              disabled={editLoading || !editForm.locker_location_detail}
            >
              {editLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังบันทึก...</span>
                </div>
              ) : (
                'บันทึกการแก้ไข'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PROVISION DIALOGS */}
      {currentUser?.role === 1 && (
        <>
          <Dialog open={isAddProvisionDialogOpen} onOpenChange={setIsAddProvisionDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>เพิ่มการลงทะเบียนล็อกเกอร์</DialogTitle>
                <DialogDescription>
                  เพิ่มการลงทะเบียนล็อกเกอร์ใหม่ในระบบ
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="create_provision_locker_id">ล็อกเกอร์ *</Label>
                  <Select
                    value={createProvisionForm.locker_id}
                    onValueChange={(value) => setCreateProvisionForm({...createProvisionForm, locker_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกล็อกเกอร์" />
                    </SelectTrigger>
                    <SelectContent>
                      {lockersWithoutProvision.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-gray-500 text-center">
                          ไม่มีล็อกเกอร์ที่พร้อมจัดสรร
                        </div>
                      ) : (
                        lockersWithoutProvision.map((locker) => (
                          <SelectItem key={locker.locker_id} value={locker.locker_id}>
                            {locker.locker_id} - {locker.Location?.location_name} ({locker.locker_location_detail})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {lockersWithoutProvision.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ ล็อกเกอร์ทั้งหมดมีการจัดสรรแล้ว
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="create_expires_at">วันหมดอายุ</Label>
                  <Input
                    id="create_expires_at"
                    type="datetime-local"
                    value={createProvisionForm.expires_at}
                    onChange={(e) => setCreateProvisionForm({...createProvisionForm, expires_at: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddProvisionDialogOpen(false)
                    setCreateProvisionForm({ locker_id: "", provision_code: "", expires_at: "" })
                  }}
                  disabled={createProvisionLoading}
                >
                  ยกเลิก
                </Button>
                <Button 
                  onClick={handleSubmitCreateProvision}
                  disabled={createProvisionLoading || !createProvisionForm.locker_id}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createProvisionLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>กำลังบันทึก...</span>
                    </div>
                  ) : (
                    'บันทึกข้อมูล'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditProvisionDialogOpen} onOpenChange={setIsEditProvisionDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>แก้ไขการลงทะเบียนล็อกเกอร์</DialogTitle>
                <DialogDescription>
                  แก้ไขข้อมูลของการลงทะเบียน {selectedProvision?.provision_code}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="edit_expires_at">วันหมดอายุ</Label>
                  <Input
                    id="edit_expires_at"
                    type="datetime-local"
                    value={editProvisionForm.expires_at}
                    onChange={(e) => setEditProvisionForm({expires_at: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditProvisionDialogOpen(false)}
                  disabled={editProvisionLoading}
                >
                  ยกเลิก
                </Button>
                <Button 
                  onClick={handleSubmitEditProvision}
                  disabled={editProvisionLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {editProvisionLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>กำลังบันทึก...</span>
                    </div>
                  ) : (
                    'บันทึกการแก้ไข'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={isDeleteProvisionDialogOpen} onOpenChange={setIsDeleteProvisionDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ยืนยันการลบการลงทะเบียน</AlertDialogTitle>
                <AlertDialogDescription>
                  คุณต้องการลบการลงทะเบียน{" "}
                  <span className="font-semibold text-gray-900">
                    {provisionToDelete?.provision_code}
                  </span>
                  {" "}ใช่หรือไม่?
                  <br />
                  <span className="text-red-600 text-sm mt-2 block">
                    ⚠️ การลบจะทำให้ไม่สามารถใช้รหัสนี้ในการเข้าถึงล็อกเกอร์ได้อีก
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel 
                  onClick={() => {
                    setIsDeleteProvisionDialogOpen(false)
                    setProvisionToDelete(null)
                  }}
                  disabled={deleteProvisionLoading}
                >
                  ยกเลิก
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteProvision}
                  disabled={deleteProvisionLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteProvisionLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>กำลังลบ...</span>
                    </div>
                  ) : (
                    'ลบการจัดสรร'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={isLockerhaveProvisionDialogOpen} onOpenChange={setIsLockerhaveProvisionDialogOpen}>
            <AlertDialogContent className="sm:max-w-[500px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-600">ไม่สามารถเพิ่มการจัดสรรได้</AlertDialogTitle>
                <AlertDialogDescription className="text-red-500">
                  ล็อกเกอร์ที่คุณเลือกมีการจัดสรรอยู่แล้ว กรุณาเลือกล็อกเกอร์อื่นหรือแก้ไขการจัดสรรที่มีอยู่
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ปิด</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}