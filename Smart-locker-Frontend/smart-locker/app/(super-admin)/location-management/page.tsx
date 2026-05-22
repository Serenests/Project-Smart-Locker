'use client'
import MapPicker from "@/components/MapPicker"
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
import { Search, Plus, Edit, Trash2, AlertTriangle, MapPin, FolderTree } from "lucide-react"
import { authService, apiClient } from "@/lib/auth"

export default function LocationManagementPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  const router = useRouter()
  
  // state สำหรับเก็บ current user
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  
  const [locations, setLocations] = useState<any[]>([])
  const [groupLocations, setGroupLocations] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchGroupTerm, setSearchGroupTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  
  // Location Dialogs
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<any>(null)
  const [locationToDelete, setLocationToDelete] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [createFormLoading, setCreateFormLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  // Group Location Dialogs
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false)
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false)
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [groupToDelete, setGroupToDelete] = useState<any>(null)
  const [createGroupLoading, setCreateGroupLoading] = useState(false)
  const [editGroupLoading, setEditGroupLoading] = useState(false)
  const [deleteGroupLoading, setDeleteGroupLoading] = useState(false)

  const [createForm, setCreateForm] = useState({
    group_location_id: "",
    location_name: "",
    latitude: "",
    longitude: "",
  })

  const [createGroupForm, setCreateGroupForm] = useState({
    group_location_name: "",
  })

  const [editForm, setEditForm] = useState({
    group_location_id: "",
    location_name: "",
    latitude: "",
    longitude: "",
  })

  const [editGroupForm, setEditGroupForm] = useState({
    group_location_name: "",
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
    
    // Role 3 และ 4 ไม่มีสิทธิ์เข้าถึง
    if (user.role === 3 || user.role === 4) {
      router.push('/dashboard');
      return;
    }

    // Create AbortController for cancellation
    const abortController = new AbortController()

    // Fetch data based on role
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchLocations(),
          fetchGroupLocations()
        ]);
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

  const fetchLocations = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const user = authService.getUser()

      console.log('🔍 Fetching locations for user:', {
        role: user.role,
        groupLocationId: user.groupLocationId,
        locationId: user.locationId
      })
      
      let response

      // เรียก API ตาม role
      if (user.role === 1) {
        // System Admin - เห็นทั้งหมด
        response = await apiClient.get(`${API_URL}/location/getAllLocations`)

      } else if (user.role === 2) {
        // Organize Admin - เห็นตาม group_location_id
        response = await apiClient.get(`${API_URL}/location/getLocationsByGroup?group_location_id=${user.groupLocationId}`)

      } else {
        // Role อื่นๆ ไม่มีสิทธิ์
        setLocations([])
        return
      }

      // จัดการข้อมูลที่ได้รับ
      const locationsData = Array.isArray(response.data.locations) 
        ? response.data.locations 
        : []

      console.log('Fetched locations:', locationsData)
      setLocations(locationsData)

    } catch (error: any) {
      console.error('Fetch locations error:', error)
      
      // จัดการ error แบบเฉพาะเจาะจง
      if (error.response?.status === 403) {
        setError('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
      } else if (error.response?.status === 404) {
        setError('ไม่พบข้อมูลสถานที่')
        setLocations([])
      } else {
        setError('ไม่สามารถดึงข้อมูลสถานที่ได้')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fetchGroupLocations = async () => {
    try {
      setIsLoadingGroups(true)
      
      const user = authService.getUser()
      let response

      // เรียก API ตาม role
      if (user.role === 1) {
        // System Admin - เห็นทั้งหมด
        response = await apiClient.get(`${API_URL}/grouplocation/getAllGrouplocations`)

      } else if (user.role === 2) {
        // Organize Admin - เห็นเฉพาะของตัวเอง (read-only)
        response = await apiClient.get(`${API_URL}/grouplocation/getGrouplocationById/${user.groupLocationId}`)

      } else {
        setGroupLocations([])
        return
      }

      // จัดการข้อมูลที่ได้รับ
      let groupLocationsData = []
      
      if (response.data.groupLocations) {
        groupLocationsData = response.data.groupLocations
      } else if (response.data.groupLocation) {
        // สำหรับ role 2 ที่ได้ object เดียว
        groupLocationsData = [response.data.groupLocation]
      }

      console.log('Fetched group locations:', groupLocationsData)
      setGroupLocations(Array.isArray(groupLocationsData) ? groupLocationsData : [])

    } catch (error: any) {
      console.error('Fetch group locations error:', error)
      if (error.response?.status === 404) {
        setGroupLocations([])
      }
    } finally {
      setIsLoadingGroups(false)
    }
  }

  const filteredLocations = locations.filter(
    (location) =>
        location.Group_Location?.group_location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.latitude?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.longitude?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredGroupLocations = groupLocations.filter(
    (group) =>
      group.group_location_name?.toLowerCase().includes(searchGroupTerm.toLowerCase())
  )

  // location functions
  const handleOpenCreateDialog = () => {
    setIsAddDialogOpen(true)
    setCreateForm({ 
      group_location_id: "", 
      location_name: "", 
      latitude: "", 
      longitude: "" 
    })
  }

  const handleSubmitCreateLocation = async () => {
    try {
      setCreateFormLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/location/createLocation`, createForm)
      
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถสร้างสถานที่ได้')
      }
      
      await fetchLocations()
      setIsAddDialogOpen(false)
      setCreateForm({ 
        group_location_id: "", 
        location_name: "", 
        latitude: "", 
        longitude: "" 
      })
      
    } catch (error: any) {
      console.error('Error creating location:', error)
      setError(error.message || 'เกิดข้อผิดพลาดในการสร้างสถานที่')
    } finally {
      setCreateFormLoading(false)
    }
  }

  const handleEditLocation = (location: any) => {
    setSelectedLocation(location)
    setEditForm({
      group_location_id: location.group_location_id || "",
      location_name: location.location_name || "",
      latitude: location.latitude || "",
      longitude: location.longitude || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleSubmitEdit = async () => {
    if (!selectedLocation) return

    try {
      setEditLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/location/updateLocation`, {
        location_id: selectedLocation.location_id,
        group_location_id: editForm.group_location_id,
        location_name: editForm.location_name,
        latitude: editForm.latitude,
        longitude: editForm.longitude,
      })

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถแก้ไขข้อมูลได้')
      }

      await fetchLocations()
      setIsEditDialogOpen(false)

    } catch (error: any) {
      console.error("Error editing location:", error)
      setError(error.message || 'เกิดข้อผิดพลาดในการแก้ไขสถานที่')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteLocation = async () => {
    if (!locationToDelete) return

    try {
      setDeleteLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/location/deleteLocation`, {
        location_id: locationToDelete.location_id
      })

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถลบสถานที่ได้')
      }

      await fetchLocations()
      setIsDeleteDialogOpen(false)
      setLocationToDelete(null)

    } catch (error: any) {
      console.error("Error deleting location:", error)
      setError(error.message || 'เกิดข้อผิดพลาดในการลบสถานที่')
    } finally {
      setDeleteLoading(false)
    }
  }

  const confirmDeleteLocation = (location: any) => {
    setLocationToDelete(location)
    setIsDeleteDialogOpen(true)
  }

  // ===== GROUP LOCATION FUNCTIONS =====
  const handleOpenCreateGroupDialog = () => {
    setIsAddGroupDialogOpen(true)
    setCreateGroupForm({ group_location_name: "" })
  }

  const handleSubmitCreateGroup = async () => {
    try {
      setCreateGroupLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/grouplocation/createGrouplocation`, createGroupForm)
      
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถสร้างกลุ่มสถานที่ได้')
      }
      
      await fetchGroupLocations()
      setIsAddGroupDialogOpen(false)
      setCreateGroupForm({ group_location_name: "" })
      
    } catch (error: any) {
      console.error('Error creating group location:', error)
      setError(error.message || 'เกิดข้อผิดพลาดในการสร้างกลุ่มสถานที่')
    } finally {
      setCreateGroupLoading(false)
    }
  }

  const handleEditGroup = (group: any) => {
    setSelectedGroup(group)
    setEditGroupForm({
      group_location_name: group.group_location_name || "",
    })
    setIsEditGroupDialogOpen(true)
  }

  const handleSubmitEditGroup = async () => {
    if (!selectedGroup) return

    try {
      setEditGroupLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/grouplocation/updateGrouplocation`, {
        group_location_id: selectedGroup.group_location_id,
        group_location_name: editGroupForm.group_location_name,
      })

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถแก้ไขข้อมูลได้')
      }

      await fetchGroupLocations()
      setIsEditGroupDialogOpen(false)

    } catch (error: any) {
      console.error("Error editing group:", error)
      setError(error.message || 'เกิดข้อผิดพลาดในการแก้ไขกลุ่มสถานที่')
    } finally {
      setEditGroupLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return

    try {
      setDeleteGroupLoading(true)
      setError(null)

      const response = await apiClient.post(`${API_URL}/grouplocation/deleteGrouplocation`, {
        group_location_id: groupToDelete.group_location_id
      })

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(response.data?.message || 'ไม่สามารถลบกลุ่มสถานที่ได้')
      }

      await fetchGroupLocations()
      setIsDeleteGroupDialogOpen(false)
      setGroupToDelete(null)

    } catch (error: any) {
      console.error("Error deleting group:", error)
      setError(error.message || 'เกิดข้อผิดพลาดในการลบกลุ่มสถานที่')
    } finally {
      setDeleteGroupLoading(false)
    }
  }

  const confirmDeleteGroup = (group: any) => {
    setGroupToDelete(group)
    setIsDeleteGroupDialogOpen(true)
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
          <h2 className="text-3xl font-bold tracking-tight">จัดการสถานที่ / กลุ่มสถานที่</h2>
          <p className="text-muted-foreground">จัดการรายการสถานที่และกลุ่มสถานที่</p>
        </div>
      </div>

      <Tabs defaultValue="locations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            สถานที่
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            กลุ่มสถานที่
          </TabsTrigger>
        </TabsList>

        {/* LOCATIONS TAB */}
        <TabsContent value="locations" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาสถานที่, ละติจูด, ลองจิจูด"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              /> 
            </div>
            {/* เฉพาะ role 1 และ 2 สามารถเพิ่มสถานที่ได้ */}
            {(currentUser?.role === 1 || currentUser?.role === 2) && (
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มสถานที่
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>รายการสถานที่ในระบบ</CardTitle>
              <CardDescription>จำนวนทั้งหมด {filteredLocations.length} สถานที่</CardDescription>
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
                        onClick={fetchLocations}
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
              ) : filteredLocations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <MapPin className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบสถานที่</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? "ไม่พบสถานที่ในระบบที่ตรงกับการค้นหา"
                      : "ยังไม่มีสถานที่ในระบบ กรุณาเพิ่มสถานที่"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อสถานที่</TableHead>
                      <TableHead>กลุ่มสถานที่</TableHead>
                      <TableHead>ละติจูด</TableHead>
                      <TableHead>ลองจิจูด</TableHead>
                      {/* เฉพาะ role 1 และ 2 เห็นคอลัมน์การจัดการ */}
                      {(currentUser?.role === 1 || currentUser?.role === 2) && (
                        <TableHead className="text-right">การจัดการ</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLocations.map((location) => (
                      <TableRow key={location.location_id}>
                        <TableCell>{location.location_name || "-"}</TableCell>
                        <TableCell className="font-medium">
                          {location.Group_Location?.group_location_name || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {location.latitude || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {location.longitude || "-"}
                        </TableCell>
                        {(currentUser?.role === 1 || currentUser?.role === 2) && (
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditLocation(location)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => confirmDeleteLocation(location)}
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

        {/* GROUP LOCATIONS TAB */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหากลุ่มสถานที่"
                value={searchGroupTerm}
                onChange={(e) => setSearchGroupTerm(e.target.value)}
                className="pl-10"
              /> 
            </div>
            {/* เฉพาะ role 1 สามารถเพิ่มกลุ่มสถานที่ได้ */}
            {currentUser?.role === 1 && (
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenCreateGroupDialog}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มกลุ่มสถานที่
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>รายการกลุ่มสถานที่ในระบบ</CardTitle>
              <CardDescription>
                จำนวนทั้งหมด {filteredGroupLocations.length} กลุ่ม
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingGroups ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
              ) : filteredGroupLocations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
                    <FolderTree className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบกลุ่มสถานที่</h3>
                  <p className="text-gray-500 mb-4">
                    {searchGroupTerm
                      ? "ไม่พบกลุ่มสถานที่ในระบบที่ตรงกับการค้นหา"
                      : "ยังไม่มีกลุ่มสถานที่ในระบบ"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รหัสกลุ่ม</TableHead>
                      <TableHead>ชื่อกลุ่มสถานที่</TableHead>
                      <TableHead>จำนวนสถานที่</TableHead>
                      {/* เฉพาะ role 1 เห็นคอลัมน์การจัดการ */}
                      {currentUser?.role === 1 && (
                        <TableHead className="text-right">การจัดการ</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroupLocations.map((group) => {
                      const locationCount = locations.filter(
                        loc => loc.group_location_id === group.group_location_id
                      ).length

                      return (
                        <TableRow key={group.group_location_id}>
                          <TableCell className="font-mono text-sm">
                            {group.group_location_id}
                          </TableCell>
                          <TableCell className="font-medium">
                            {group.group_location_name}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {locationCount} สถานที่
                            </span>
                          </TableCell>
                          {currentUser?.role === 1 && (
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEditGroup(group)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => confirmDeleteGroup(group)}
                                  disabled={locationCount > 0}
                                  title={locationCount > 0 ? "ไม่สามารถลบได้เนื่องจากมีสถานที่ในกลุ่มนี้" : ""}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* LOCATION DIALOGS */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสถานที่</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบสถานที่{" "}
              <span className="font-semibold text-gray-900">
                {locationToDelete?.location_name}
              </span>
              {" "}ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setLocationToDelete(null)
              }}
              disabled={deleteLoading}
            >
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocation}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังลบ...</span>
                </div>
              ) : (
                'ลบสถานที่'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มสถานที่</DialogTitle>
            <DialogDescription>
              เพิ่มข้อมูลของสถานที่ใหม่ในระบบ
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="create_group_location_id">กลุ่มสถานที่ *</Label>
                <Select
                  value={createForm.group_location_id}
                  onValueChange={(value) => setCreateForm({...createForm, group_location_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกกลุ่มสถานที่" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupLocations.map((group) => (
                      <SelectItem key={group.group_location_id} value={group.group_location_id}>
                        {group.group_location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="create_location_name">ชื่อสถานที่ *</Label>
                <Input
                  id="create_location_name"
                  value={createForm.location_name}
                  onChange={(e) => setCreateForm({...createForm, location_name: e.target.value})}
                  placeholder="เช่น หน่วยงานเภสัชกรรม"
                />
              </div>
              <div className="col-span-2">
                <Label>ตำแหน่งบนแผนที่</Label>
                <div className="mt-2">
                  <MapPicker
                    latitude={createForm.latitude}
                    longitude={createForm.longitude}
                    onLocationSelect={(lat, lng) => {
                      setCreateForm({
                        ...createForm,
                        latitude: lat,
                        longitude: lng
                      })
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false)
                setCreateForm({ 
                  group_location_id: "", 
                  location_name: "",
                  latitude: "", 
                  longitude: "" 
                })
              }}
              disabled={createFormLoading}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSubmitCreateLocation}
              disabled={createFormLoading || !createForm.group_location_id || !createForm.location_name}
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
            <DialogTitle>แก้ไขสถานที่</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลของสถานที่ {selectedLocation?.location_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="edit_group_location_id">กลุ่มสถานที่ *</Label>
                <Select
                  value={editForm.group_location_id}
                  onValueChange={(value) => setEditForm({...editForm, group_location_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกกลุ่มสถานที่" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupLocations.map((group) => (
                      <SelectItem key={group.group_location_id} value={group.group_location_id}>
                        {group.group_location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="edit_location_name">ชื่อสถานที่ *</Label>
                <Input
                  id="edit_location_name"
                  value={editForm.location_name}
                  onChange={(e) => setEditForm({...editForm, location_name: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label>ตำแหน่งบนแผนที่</Label>
                <div className="mt-2">
                  <MapPicker
                    latitude={editForm.latitude}
                    longitude={editForm.longitude}
                    onLocationSelect={(lat, lng) => {
                      setEditForm({
                        ...editForm,
                        latitude: lat,
                        longitude: lng
                      })
                    }}
                  />
                </div>
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
              disabled={editLoading || !editForm.location_name || !editForm.group_location_id}
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

      {/* GROUP LOCATION DIALOGS - เฉพาะ role 1 */}
      {currentUser?.role === 1 && (
        <>
          <Dialog open={isAddGroupDialogOpen} onOpenChange={setIsAddGroupDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>เพิ่มกลุ่มสถานที่</DialogTitle>
                <DialogDescription>
                  เพิ่มกลุ่มสถานที่ใหม่ในระบบ
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="create_group_name">ชื่อกลุ่มสถานที่ *</Label>
                  <Input
                    id="create_group_name"
                    value={createGroupForm.group_location_name}
                    onChange={(e) => setCreateGroupForm({group_location_name: e.target.value})}
                    placeholder="เช่น อาคาร A, ชั้น 1, โซน A"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddGroupDialogOpen(false)
                    setCreateGroupForm({ group_location_name: "" })
                  }}
                  disabled={createGroupLoading}
                >
                  ยกเลิก
                </Button>
                <Button 
                  onClick={handleSubmitCreateGroup}
                  disabled={createGroupLoading || !createGroupForm.group_location_name}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createGroupLoading ? (
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

          <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>แก้ไขกลุ่มสถานที่</DialogTitle>
                <DialogDescription>
                  แก้ไขข้อมูลของกลุ่มสถานที่ {selectedGroup?.group_location_name}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="edit_group_name">ชื่อกลุ่มสถานที่ *</Label>
                  <Input
                    id="edit_group_name"
                    value={editGroupForm.group_location_name}
                    onChange={(e) => setEditGroupForm({group_location_name: e.target.value})}
                    placeholder="เช่น อาคาร A, ชั้น 1, โซน A"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditGroupDialogOpen(false)}
                  disabled={editGroupLoading}
                >
                  ยกเลิก
                </Button>
                <Button 
                  onClick={handleSubmitEditGroup}
                  disabled={editGroupLoading || !editGroupForm.group_location_name}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {editGroupLoading ? (
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

          <AlertDialog open={isDeleteGroupDialogOpen} onOpenChange={setIsDeleteGroupDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ยืนยันการลบกลุ่มสถานที่</AlertDialogTitle>
                <AlertDialogDescription>
                  คุณต้องการลบกลุ่มสถานที่{" "}
                  <span className="font-semibold text-gray-900">
                    {groupToDelete?.group_location_name}
                  </span>
                  {" "}ใช่หรือไม่?
                  <br />
                  <span className="text-red-600 text-sm mt-2 block">
                    ⚠️ การลบจะส่งผลต่อสถานที่ทั้งหมดที่อยู่ในกลุ่มนี้
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel 
                  onClick={() => {
                    setIsDeleteGroupDialogOpen(false)
                    setGroupToDelete(null)
                  }}
                  disabled={deleteGroupLoading}
                >
                  ยกเลิก
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteGroup}
                  disabled={deleteGroupLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteGroupLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>กำลังลบ...</span>
                    </div>
                  ) : (
                    'ลบกลุ่มสถานที่'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}