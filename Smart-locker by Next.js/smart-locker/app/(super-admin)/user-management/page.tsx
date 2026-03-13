// app/(super-admin)/user-management/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Switch } from "@/components/ui/switch"
import { Search, Plus, Edit, Trash2, Eye, AlertTriangle, Shield } from "lucide-react"
import { apiClient, authService } from "@/lib/auth"

export default function UsersPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  const [currentUser, setCurrentUser] = useState<any>(null)

  // UserLockerGrant State
  const [grants, setGrants] = useState<any[]>([])
  const [searchGrantTerm, setSearchGrantTerm] = useState("")
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false)
  const [isEditGrantDialogOpen, setIsEditGrantDialogOpen] = useState(false)
  const [isDeleteGrantDialogOpen, setIsDeleteGrantDialogOpen] = useState(false)
  const [selectedGrant, setSelectedGrant] = useState<any>(null)
  const [grantToDelete, setGrantToDelete] = useState<any>(null)
  const [grantLoading, setGrantLoading] = useState(false)
  const [grantsError, setGrantsError] = useState<string | null>(null)
  const [filteredLockers, setFilteredLockers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  // ✅ เพิ่ม state สำหรับ Group Locations
  const [groupLocations, setGroupLocations] = useState<any[]>([])

  // ✅ เพิ่ม state สำหรับ Edit User - filtered locations
  const [editFilteredLocations, setEditFilteredLocations] = useState<any[]>([])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/signin');
      return;
    }

    const user = authService.getUser();
    setCurrentUser(user);
    console.log('✅ Current user:', user);

    fetchUsers();
    fetchGrants();
    fetchLocations();
    fetchGroupLocations(); // ✅ เพิ่ม
  }, []);

  // Edit form state - ✅ เพิ่ม location_id และ group_location_id
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    gender: "",
    religion: "",
    role_id: "",
    location_id: "",
    group_location_id: "",
  })

  // Grant form state
  const [grantForm, setGrantForm] = useState({
    user_id: "",
    granted_by: "",
    permission_withdraw: 1,
    permission_restock: 0,
    locker_id: "",
    location_id: "",
  })

  // ✅ Helper function: ตรวจสอบว่า user สามารถลบได้หรือไม่
  const canDeleteGrant = () => {
    return currentUser?.role !== 4; // เฉพาะ System Admin
  }

  // ✅ Helper function: ตรวจสอบว่า user สามารถเพิ่มการให้สิทธิ์ได้หรือไม่
  const canCreateGrant = () => {
    return currentUser?.role !== 4; // ทุกคนยกเว้น User (role=4)
  }

  // ✅ Helper function: กรอง locations ตาม scope
  const getFilteredLocations = () => {
    if (!currentUser) return locations;

    // System Admin (1) - เห็นทุก location
    if (currentUser.role === 1) {
      return locations;
    }

    // Organize Admin (2) - เห็นเฉพาะ locations ใน group_location_id เดียวกัน
    if (currentUser.role === 2 && currentUser.groupLocationId) {
      return locations.filter(loc => loc.group_location_id === currentUser.groupLocationId);
    }

    // Department Admin (3) - เห็นเฉพาะ location_id ของตัวเอง
    if (currentUser.role === 3 && currentUser.locationId) {
      return locations.filter(loc => loc.location_id === currentUser.locationId);
    }

    // User (4) - ไม่ควรเห็นเลย แต่ถ้ามี return empty
    return [];
  }

  // ✅ Helper function: กรอง group locations ตาม scope
  const getFilteredGroupLocations = () => {
    if (!currentUser) return groupLocations;

    // System Admin (1) - เห็นทุก group location
    if (currentUser.role === 1) {
      return groupLocations;
    }

    // Organize Admin (2) - เห็นเฉพาะ group ของตัวเอง
    if (currentUser.role === 2 && currentUser.groupLocationId) {
      return groupLocations.filter(g => g.group_location_id === currentUser.groupLocationId);
    }

    // Department Admin (3) - เห็นเฉพาะ group ของตัวเอง
    if (currentUser.role === 3 && currentUser.groupLocationId) {
      return groupLocations.filter(g => g.group_location_id === currentUser.groupLocationId);
    }

    return [];
  }

  const handleViewUser = (user: any) => {
    setSelectedUser(user)
    setIsViewDialogOpen(true)
  }

  const handleEditUser = (user: any) => {
    setSelectedUser(user)
    setEditForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      phone_number: user.phone_number || "",
      gender: user.gender || "",
      religion: user.religion || "",
      role_id: user.role_id?.toString() || "",
      location_id: user.location_id?.toString() || "",
      group_location_id: user.group_location_id?.toString() || "",
    })

    // ✅ โหลด locations ตาม group_location_id ของ user
    if (user.group_location_id) {
      fetchLocationsByGroup(user.group_location_id.toString());
    }

    setIsEditDialogOpen(true)
  }

  // ✅ เพิ่มฟังก์ชันดึง locations ตาม group
  const fetchLocationsByGroup = async (groupLocationId: string) => {
    try {
      const response = await apiClient.get(`/location/getLocationsByGroup?group_location_id=${groupLocationId}`);
      console.log('✅ Locations by group fetched:', response.data);
      setEditFilteredLocations(Array.isArray(response.data.locations) ? response.data.locations : []);
    } catch (error: any) {
      console.error("❌ Error fetching locations by group:", error);
      setEditFilteredLocations([]);
    }
  }

  // ✅ Handler เมื่อเปลี่ยน group location ในฟอร์มแก้ไข
  const handleEditGroupLocationChange = (groupLocationId: string) => {
    setEditForm({
      ...editForm,
      group_location_id: groupLocationId,
      location_id: "" // reset location เมื่อเปลี่ยน group
    });

    if (groupLocationId) {
      fetchLocationsByGroup(groupLocationId);
    } else {
      setEditFilteredLocations([]);
    }
  }

  const handleSubmitEdit = async () => {
    if (!selectedUser) return

    try {
      setEditLoading(true)

      const response = await apiClient.post('/user/editUser', {
        user_id: selectedUser.user_id,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone_number: editForm.phone_number,
        gender: editForm.gender,
        religion: editForm.religion,
        role_id: parseInt(editForm.role_id),
        // ✅ เพิ่ม location_id และ group_location_id
        location_id: editForm.location_id ? parseInt(editForm.location_id) : null,
        group_location_id: editForm.group_location_id ? parseInt(editForm.group_location_id) : null,
      });

      console.log('✅ User updated:', response.data);
      setIsEditDialogOpen(false);
      fetchUsers();

    } catch (error: any) {
      console.error("❌ Error editing user:", error);
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`);
    } finally {
      setEditLoading(false);
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching users...');

      const response = await apiClient.get('/user/getAllUsers');

      console.log('✅ Users fetched:', response.data);
      setUsers(Array.isArray(response.data.users) ? response.data.users : []);

    } catch (error: any) {
      console.error("❌ Error fetching users:", error);
      setError(error.response?.data?.message || error.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      setDeleteLoading(true);

      const response = await apiClient.post('/user/deleteUser', {
        user_id: userToDelete.user_id
      });

      console.log('✅ User deleted:', response.data);
      setUsers(users.filter(user => user.user_id !== userToDelete.user_id));
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);

    } catch (error: any) {
      console.error("❌ Error deleting user:", error);
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`);
    } finally {
      setDeleteLoading(false);
    }
  }

  // ============================================
  // UserLockerGrant Functions
  // ============================================

  const fetchGrants = async () => {
    try {
      setGrantLoading(true);
      setGrantsError(null);

      const response = await apiClient.get('/userLockerGrant/getAllUserLockerGrant');

      console.log('✅ Grants fetched:', response.data);
      setGrants(Array.isArray(response.data) ? response.data : []);

    } catch (error: any) {
      console.error("❌ Error fetching grants:", error);
      setGrantsError(error.response?.data?.message || error.message || "Failed to load grants");
      setGrants([]);
    } finally {
      setGrantLoading(false);
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await apiClient.get('/location/getAllLocations');

      console.log('✅ Locations fetched:', response.data);
      setLocations(Array.isArray(response.data.locations) ? response.data.locations : []);

    } catch (error: any) {
      console.error("❌ Error fetching locations:", error);
    }
  }

  // ✅ เพิ่มฟังก์ชันดึง Group Locations
  const fetchGroupLocations = async () => {
    try {
      const response = await apiClient.get('/grouplocation/getAllGrouplocations');

      console.log('✅ Group Locations fetched:', response.data);
      setGroupLocations(Array.isArray(response.data.groupLocations) ? response.data.groupLocations : []);

    } catch (error: any) {
      console.error("❌ Error fetching group locations:", error);
    }
  }

  // ✅ แก้ไข: ดึงเฉพาะ Locker ที่ activated แล้ว
  const fetchLockersByLocation = async (locationId: string) => {
    try {
      // ✅ เปลี่ยนจาก getLockersByLocationId เป็น getActivatedLockersByLocationId
      const response = await apiClient.get(`/locker/getActivatedLockersByLocationId/${locationId}`);

      console.log('✅ Activated Lockers fetched:', response.data);
      setFilteredLockers(Array.isArray(response.data.lockers) ? response.data.lockers : []);

    } catch (error: any) {
      console.error("❌ Error fetching activated lockers:", error);
      setFilteredLockers([]);
    }
  }

  const handleLocationChange = (locationId: string) => {
    setGrantForm({ ...grantForm, location_id: locationId, locker_id: "" })
    if (locationId) {
      fetchLockersByLocation(locationId)
    } else {
      setFilteredLockers([])
    }
  }

  const handleCreateGrant = () => {
    // ✅ กำหนด location_id default สำหรับ Department Admin
    let defaultLocationId = "";
    if (currentUser?.role === 3 && currentUser?.locationId) {
      defaultLocationId = currentUser.locationId.toString();
    }

    setGrantForm({
      user_id: "",
      granted_by: currentUser?.id || "",
      permission_withdraw: 1,
      permission_restock: 0,
      locker_id: "",
      location_id: defaultLocationId,
    })

    // ✅ ถ้ามี default location ให้โหลด lockers เลย
    if (defaultLocationId) {
      fetchLockersByLocation(defaultLocationId);
    } else {
      setFilteredLockers([]);
    }

    setIsGrantDialogOpen(true)
  }

  const handleEditGrant = (grant: any) => {
    setSelectedGrant(grant)
    setGrantForm({
      user_id: grant.user_id?.toString() || "",
      granted_by: grant.granted_by?.toString() || "",
      permission_withdraw: grant.permission_withdraw === 1 || grant.permission_withdraw === true ? 1 : 0,
      permission_restock: grant.permission_restock === 1 || grant.permission_restock === true ? 1 : 0,
      locker_id: grant.locker_id ? grant.locker_id.toString() : "",
      location_id: grant.location_id ? grant.location_id.toString() : "",
    })

    if (grant.location_id) {
      fetchLockersByLocation(grant.location_id.toString())
    }

    setIsEditGrantDialogOpen(true)
  }

  const handleSubmitCreateGrant = async () => {
    try {
      setGrantLoading(true);

      const response = await apiClient.post('/userLockerGrant/createUserLockerGrant', {
        user_id: grantForm.user_id,
        granted_by: grantForm.granted_by,
        permission_withdraw: grantForm.permission_withdraw,
        permission_restock: grantForm.permission_restock,
        locker_id: parseInt(grantForm.locker_id),
        location_id: parseInt(grantForm.location_id),
      });

      console.log('✅ Grant created:', response.data);
      setIsGrantDialogOpen(false);
      fetchGrants();

    } catch (error: any) {
      console.error("❌ Error creating grant:", error);
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`);
    } finally {
      setGrantLoading(false);
    }
  }

  const handleSubmitEditGrant = async () => {
    if (!selectedGrant) return

    try {
      setGrantLoading(true);

      const response = await apiClient.post('/userLockerGrant/updateUserLockerGrant', {
        user_locker_grant_id: selectedGrant.user_locker_grant_id,
        user_id: grantForm.user_id,
        granted_by: grantForm.granted_by,
        permission_withdraw: grantForm.permission_withdraw,
        permission_restock: grantForm.permission_restock,
        locker_id: parseInt(grantForm.locker_id),
        location_id: parseInt(grantForm.location_id),
      });

      console.log('✅ Grant updated:', response.data);
      setIsEditGrantDialogOpen(false);
      fetchGrants();

    } catch (error: any) {
      console.error("❌ Error updating grant:", error);
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`);
    } finally {
      setGrantLoading(false);
    }
  }

  const confirmDeleteGrant = (grant: any) => {
    setGrantToDelete(grant)
    setIsDeleteGrantDialogOpen(true)
  }

  const handleDeleteGrant = async () => {
    if (!grantToDelete) return

    try {
      setGrantLoading(true);

      const response = await apiClient.post('/userLockerGrant/deleteUserLockerGrant', {
        user_locker_grant_id: grantToDelete.user_locker_grant_id
      });

      console.log('✅ Grant deleted:', response.data);
      setGrants(grants.filter(g => g.user_locker_grant_id !== grantToDelete.user_locker_grant_id));
      setIsDeleteGrantDialogOpen(false);
      setGrantToDelete(null);

    } catch (error: any) {
      console.error("❌ Error deleting grant:", error);
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`);
    } finally {
      setGrantLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const confirmDeleteUser = (user: any) => {
    setUserToDelete(user)
    setIsDeleteDialogOpen(true)
  }

  const filteredUsers = users.filter(
    (user) =>
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ✅ กรอง grants ตาม scope
  const getFilteredGrants = () => {
    if (!currentUser) return grants;

    // System Admin (1) - เห็นทุก grant
    if (currentUser.role === 1) {
      return grants;
    }

    // Organize Admin (2) - เห็นเฉพาะ grants ใน group_location_id เดียวกัน
    if (currentUser.role === 2 && currentUser.groupLocationId) {
      return grants.filter(grant =>
        grant.location_id === currentUser.locationId
      );
    }

    // Department Admin (3) - เห็นเฉพาะ grants ใน location_id เดียวกัน
    if (currentUser.role === 3 && currentUser.locationId) {
      return grants.filter(grant =>
        grant.location_id === currentUser.locationId
      );
    }

    // User (4) - เห็นเฉพาะของตัวเอง (ถ้ามี)
    if (currentUser.role === 4 && currentUser.id) {
      return grants.filter(grant => grant.user_id === currentUser.id);
    }

    return [];
  }

  const filteredGrants = getFilteredGrants().filter(
    (grant) =>
      grant.User?.first_name?.toLowerCase().includes(searchGrantTerm.toLowerCase()) ||
      grant.User?.last_name?.toLowerCase().includes(searchGrantTerm.toLowerCase()) ||
      grant.Locker?.locker_location_detail?.toLowerCase().includes(searchGrantTerm.toLowerCase()) ||
      grant.Location?.location_name?.toLowerCase().includes(searchGrantTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">จัดการผู้ใช้</h2>
          <p className="text-muted-foreground">
            จัดการข้อมูลผู้ใช้และสิทธิ์การเข้าถึง
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">จัดการผู้ใช้</TabsTrigger>
          {currentUser.role === 1 || currentUser.role === 3 ? (
            <TabsTrigger value="grants">
              <Shield className="h-4 w-4 mr-2" />
              การให้สิทธิ์
            </TabsTrigger>
          ) : null}

        </TabsList>

        {/* Tab 1: User Management */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาชื่อ, เลขบัตรประชาชน, หรือบทบาท..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>รายการผู้ใช้ในระบบ</CardTitle>
              <CardDescription>
                ผู้ใช้ที่มีสิทธิ์เข้าถึงระบบตู้ล็อคเกอร์ยาควบคุม
                {users.length > 0 && ` (${users.length} คน)`}
              </CardDescription>
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
                        onClick={fetchUsers}
                        className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                      >
                        ลองอีกครั้ง
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบผู้ใช้</h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm
                      ? "ไม่พบผู้ใช้ที่ตรงกับคำค้นหา"
                      : "ยังไม่มีผู้ใช้ในระบบ หรือคุณไม่มีสิทธิ์เห็นผู้ใช้"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ-นามสกุล</TableHead>
                      <TableHead>หน่วยงาน</TableHead>
                      <TableHead>กลุ่มหน่วยงาน</TableHead>
                      <TableHead>บทบาท</TableHead>
                      <TableHead>อีเมล</TableHead>
                      <TableHead>เบอร์โทร</TableHead>
                      <TableHead className="text-right">การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {user.location_name || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {user.group_name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role || "-"}</Badge>
                        </TableCell>
                        <TableCell>{user.email || "-"}</TableCell>
                        <TableCell>{user.phone_number || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewUser(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => confirmDeleteUser(user)}
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

        {/* Tab 2: UserLockerGrant Management */}
        <TabsContent value="grants" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาชื่อผู้ใช้, ล็อกเกอร์, หรือสถานที่..."
                value={searchGrantTerm}
                onChange={(e) => setSearchGrantTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* ✅ แสดงปุ่มเพิ่มเฉพาะ role ที่มีสิทธิ์ */}
            {canCreateGrant() && (
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateGrant}>
                <Plus className="h-4 w-4 mr-2 " />
                เพิ่มการให้สิทธิ์
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>รายการการให้สิทธิ์</CardTitle>
              <CardDescription>
                จัดการสิทธิ์การเข้าถึงล็อกเกอร์ของผู้ใช้แต่ละคน
                {filteredGrants.length > 0 && ` (${filteredGrants.length} รายการ)`}
                <br />
              </CardDescription>
            </CardHeader>
            <CardContent>
              {grantsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">เกิดข้อผิดพลาด</h3>
                      <p className="text-sm text-red-700 mt-1">{grantsError}</p>
                      <button
                        onClick={fetchGrants}
                        className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                      >
                        ลองอีกครั้ง
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {filteredGrants.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Shield className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบการให้สิทธิ์</h3>
                  <p className="text-gray-500 mb-4">
                    {searchGrantTerm
                      ? "ไม่พบการให้สิทธิ์ที่ตรงกับคำค้นหา"
                      : "ยังไม่มีการให้สิทธิ์ในระบบ"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ผู้ใช้</TableHead>
                      <TableHead>ล็อกเกอร์</TableHead>
                      <TableHead>สถานที่</TableHead>
                      <TableHead>สิทธิ์เบิก</TableHead>
                      <TableHead>สิทธิ์เติมยา</TableHead>
                      <TableHead className="text-right">การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGrants.map((grant) => (
                      <TableRow key={grant.user_locker_grant_id}>
                        <TableCell className="font-medium">
                          {grant.User?.first_name} {grant.User?.last_name}
                        </TableCell>
                        <TableCell>
                          {grant.Locker?.locker_location_detail || "-"}
                        </TableCell>
                        <TableCell>
                          {grant.Location?.location_name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={grant.permission_withdraw === 1 ? "default" : "secondary"}
                            className={grant.permission_withdraw === 1 ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"}
                          >
                            {grant.permission_withdraw === 1 ? "อนุญาต" : "ไม่อนุญาต"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={grant.permission_restock === 1 ? "default" : "secondary"}
                            className={grant.permission_restock === 1 ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"}
                          >
                            {grant.permission_restock === 1 ? "อนุญาต" : "ไม่อนุญาต"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditGrant(grant)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {/* ✅ แสดงปุ่มลบเฉพาะ System Admin */}
                            {canDeleteGrant() && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => confirmDeleteGrant(grant)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
      </Tabs>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>ข้อมูลผู้ใช้</DialogTitle>
            <DialogDescription>
              รายละเอียดข้อมูลผู้ใช้ในระบบ
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">ชื่อ</Label>
                  <p className="mt-1 text-sm">{selectedUser.first_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">นามสกุล</Label>
                  <p className="mt-1 text-sm">{selectedUser.last_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">เลขบัตรประชาชน</Label>
                  <p className="mt-1 text-sm font-mono">{selectedUser.citizen_id || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">รหัสบัตร</Label>
                  <p className="mt-1 text-sm font-mono">{selectedUser.card_uid || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">อีเมล</Label>
                  <p className="mt-1 text-sm">{selectedUser.email || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">เบอร์โทรศัพท์</Label>
                  <p className="mt-1 text-sm">{selectedUser.phone_number || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">เพศ</Label>
                  <p className="mt-1 text-sm">{selectedUser.gender || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">ศาสนา</Label>
                  <p className="mt-1 text-sm">{selectedUser.religion || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">บทบาท</Label>
                  <p className="mt-1">
                    <Badge>{selectedUser.role || "-"}</Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">วันเกิด</Label>
                  <p className="mt-1 text-sm">{formatDate(selectedUser.date_of_birth)}</p>
                </div>
              </div>
              {/* ✅ เพิ่มการแสดง Location และ Group Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">หน่วยงาน</Label>
                  <p className="mt-1 text-sm">{selectedUser.location_name || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">กลุ่มหน่วยงาน</Label>
                  <p className="mt-1 text-sm">{selectedUser.group_name || "-"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog - ✅ เพิ่ม Group Location และ Location */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลของ {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_first_name">ชื่อ *</Label>
                <Input
                  id="edit_first_name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_last_name">นามสกุล *</Label>
                <Input
                  id="edit_last_name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_email">อีเมล</Label>
              <Input
                type="email"
                id="edit_email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="bg-gray-50"
                disabled
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="edit_phone"
                  value={editForm.phone_number}
                  onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                  placeholder="0812345678"
                />
              </div>
              <div>
                <Label htmlFor="edit_gender">เพศ</Label>
                <Select
                  value={editForm.gender}
                  onValueChange={(value) => setEditForm({ ...editForm, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกเพศ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ชาย">ชาย</SelectItem>
                    <SelectItem value="หญิง">หญิง</SelectItem>
                    <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_religion">ศาสนา</Label>
                <Input
                  id="edit_religion"
                  value={editForm.religion}
                  onChange={(e) => setEditForm({ ...editForm, religion: e.target.value })}
                  placeholder="พุทธ"
                />
              </div>
              <div>
                <Label htmlFor="edit_role">บทบาท</Label>
                <Select
                  value={editForm.role_id}
                  onValueChange={(value) => setEditForm({ ...editForm, role_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">System Admin</SelectItem>
                    <SelectItem value="2">Organize Admin</SelectItem>
                    <SelectItem value="3">Department Admin</SelectItem>
                    <SelectItem value="4">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ✅ เพิ่ม Group Location และ Location */}
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium mb-3">ข้อมูลหน่วยงาน</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_group_location">กลุ่มหน่วยงาน</Label>
                  <Select
                    value={editForm.group_location_id}
                    onValueChange={handleEditGroupLocationChange}
                    disabled={currentUser?.role === 3} // Department Admin ไม่สามารถเปลี่ยน group ได้
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกกลุ่มหน่วยงาน" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilteredGroupLocations().map((group) => (
                        <SelectItem key={group.group_location_id} value={group.group_location_id.toString()}>
                          {group.group_location_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit_location">หน่วยงาน</Label>
                  <Select
                    value={editForm.location_id}
                    onValueChange={(value) => setEditForm({ ...editForm, location_id: value })}
                    disabled={!editForm.group_location_id || currentUser?.role === 3}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={editForm.group_location_id ? "เลือกหน่วยงาน" : "เลือกกลุ่มหน่วยงานก่อน"} />
                    </SelectTrigger>
                    <SelectContent>
                      {editFilteredLocations.map((location) => (
                        <SelectItem key={location.location_id} value={location.location_id.toString()}>
                          {location.location_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              disabled={editLoading || !editForm.first_name || !editForm.last_name}
            >
              {editLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบผู้ใช้</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบผู้ใช้{" "}
              <span className="font-semibold text-gray-900">
                {userToDelete?.first_name} {userToDelete?.last_name}
              </span>
              {" "}ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setUserToDelete(null)
              }}
              disabled={deleteLoading}
            >
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังลบ...</span>
                </div>
              ) : (
                'ลบผู้ใช้'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Grant Dialog */}
      <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>เพิ่มการให้สิทธิ์ใหม่</DialogTitle>
            <DialogDescription>
              กำหนดสิทธิ์การเข้าถึงล็อกเกอร์สำหรับผู้ใช้
              <br />
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grant_user">ผู้ใช้ *</Label>
                <Select
                  value={grantForm.user_id}
                  onValueChange={(value) => setGrantForm({ ...grantForm, user_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ใช้" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id.toString()}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="grant_granted_by">ผู้อนุมัติ *</Label>
                <Input
                  id="grant_granted_by"
                  value={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}
                  disabled
                  className="bg-gray-100"
                />
                <input type="hidden" value={grantForm.granted_by} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grant_location">สถานที่ *</Label>
                <Select
                  value={grantForm.location_id}
                  onValueChange={handleLocationChange}
                  // ✅ Disable ถ้าเป็น Department Admin (จะมี default location แล้ว)
                  disabled={currentUser?.role === 3}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสถานที่" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* ✅ กรอง locations ตาม scope */}
                    {getFilteredLocations().map((location) => (
                      <SelectItem key={location.location_id} value={location.location_id.toString()}>
                        {location.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="grant_locker">ล็อกเกอร์ * <span className="text-xs text-green-600">(Activated)</span></Label>
                <Select
                  value={grantForm.locker_id}
                  onValueChange={(value) => setGrantForm({ ...grantForm, locker_id: value })}
                  disabled={!grantForm.location_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !grantForm.location_id
                        ? "เลือกสถานที่ก่อน"
                        : filteredLockers.length === 0
                          ? "ไม่มีล็อกเกอร์ที่ activated"
                          : "เลือกล็อกเกอร์"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLockers.length === 0 ? (
                      <div className="px-2 py-4 text-center text-sm text-gray-500">
                        ไม่พบล็อกเกอร์ที่ activated ในสถานที่นี้
                      </div>
                    ) : (
                      filteredLockers.map((locker) => (
                        <SelectItem key={locker.locker_id} value={locker.locker_id.toString()}>
                          {locker.locker_location_detail}
                          {locker.Locker_Provision && (
                            <span className="ml-2 text-xs text-green-600">
                              ({locker.Locker_Provision.provision_code})
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>สิทธิ์เบิกยา</Label>
                  <p className="text-sm text-gray-500">อนุญาตให้เบิกยาจากล็อกเกอร์</p>
                </div>
                <Switch
                  checked={grantForm.permission_withdraw === 1}
                  onCheckedChange={(checked: boolean) =>
                    setGrantForm({ ...grantForm, permission_withdraw: checked ? 1 : 0 })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>สิทธิ์เติมยา</Label>
                  <p className="text-sm text-gray-500">อนุญาตให้เติมยาในล็อกเกอร์</p>
                </div>
                <Switch
                  checked={grantForm.permission_restock === 1}
                  onCheckedChange={(checked: boolean) =>
                    setGrantForm({ ...grantForm, permission_restock: checked ? 1 : 0 })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGrantDialogOpen(false)}
              disabled={grantLoading}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmitCreateGrant}
              disabled={
                grantLoading ||
                !grantForm.user_id ||
                !grantForm.granted_by ||
                !grantForm.locker_id ||
                !grantForm.location_id
              }
            >
              {grantLoading ? "กำลังบันทึก..." : "สร้างการให้สิทธิ์"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Grant Dialog */}
      <Dialog open={isEditGrantDialogOpen} onOpenChange={setIsEditGrantDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>แก้ไขการให้สิทธิ์</DialogTitle>
            <DialogDescription>
              แก้ไขสิทธิ์การเข้าถึงล็อกเกอร์
              <br />
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_grant_user">ผู้ใช้ *</Label>
                <Select
                  value={grantForm.user_id}
                  onValueChange={(value) => setGrantForm({ ...grantForm, user_id: value })}
                  disabled={true}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ใช้" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id.toString()}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_grant_granted_by">ผู้อนุมัติ *</Label>
                <Select
                  value={grantForm.granted_by}
                  onValueChange={(value) => setGrantForm({ ...grantForm, granted_by: value })}
                  disabled={true}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้อนุมัติ" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => [1, 2, 3].includes(u.role_id)).map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id.toString()}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_grant_location">สถานที่ *</Label>
                <Select
                  value={grantForm.location_id}
                  onValueChange={handleLocationChange}
                  // ✅ Disable ถ้าเป็น Department Admin
                  disabled={currentUser?.role === 3}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสถานที่" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* ✅ กรอง locations ตาม scope */}
                    {getFilteredLocations().map((location) => (
                      <SelectItem key={location.location_id} value={location.location_id.toString()}>
                        {location.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_grant_locker">ล็อกเกอร์ * <span className="text-xs text-green-600">(Activated)</span></Label>
                <Select
                  value={grantForm.locker_id}
                  onValueChange={(value) => setGrantForm({ ...grantForm, locker_id: value })}
                  disabled={!grantForm.location_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !grantForm.location_id
                        ? "เลือกสถานที่ก่อน"
                        : filteredLockers.length === 0
                          ? "ไม่มีล็อกเกอร์ที่ activated"
                          : "เลือกล็อกเกอร์"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLockers.length === 0 ? (
                      <div className="px-2 py-4 text-center text-sm text-gray-500">
                        ไม่พบล็อกเกอร์ที่ activated ในสถานที่นี้
                      </div>
                    ) : (
                      filteredLockers.map((locker) => (
                        <SelectItem key={locker.locker_id} value={locker.locker_id.toString()}>
                          {locker.locker_location_detail}
                          {locker.Locker_Provision && (
                            <span className="ml-2 text-xs text-green-600">
                              ({locker.Locker_Provision.provision_code})
                            </span>
                          )}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>สิทธิ์เบิกยา</Label>
                  <p className="text-sm text-gray-500">อนุญาตให้เบิกยาจากล็อกเกอร์</p>
                </div>
                <Switch
                  checked={grantForm.permission_withdraw === 1}
                  onCheckedChange={(checked: boolean) =>
                    setGrantForm({ ...grantForm, permission_withdraw: checked ? 1 : 0 })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>สิทธิ์เติมยา</Label>
                  <p className="text-sm text-gray-500">อนุญาตให้เติมยาในล็อกเกอร์</p>
                </div>
                <Switch
                  checked={grantForm.permission_restock === 1}
                  onCheckedChange={(checked: boolean) =>
                    setGrantForm({ ...grantForm, permission_restock: checked ? 1 : 0 })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditGrantDialogOpen(false)}
              disabled={grantLoading}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmitEditGrant}
              disabled={
                grantLoading ||
                !grantForm.user_id ||
                !grantForm.granted_by ||
                !grantForm.locker_id ||
                !grantForm.location_id
              }
            >
              {grantLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Grant Confirmation Dialog */}
      <AlertDialog open={isDeleteGrantDialogOpen} onOpenChange={setIsDeleteGrantDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบการให้สิทธิ์</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบการให้สิทธิ์นี้ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteGrantDialogOpen(false)
                setGrantToDelete(null)
              }}
              disabled={grantLoading}
            >
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGrant}
              disabled={grantLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {grantLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังลบ...</span>
                </div>
              ) : (
                'ลบการให้สิทธิ์'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}