//app/transaction/page.tsx
'use client'
import { thSarabunBase64 } from "@/lib/thsarabun-font"
import { useState, useEffect, use } from "react"
import { Camera, Image as ImageIcon } from 'lucide-react'
import React from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, Trash2, Eye, AlertTriangle, ShoppingCart, CheckCircle, XCircle, Package, FileText, Download } from "lucide-react"
import { authService, apiClient } from "@/lib/auth"
import { ChevronRight, ChevronDown } from "lucide-react"

interface CartItem {
  slot_stock_id: number
  product_id: string
  lot_id: string
  slot_id: number
  amount: number
  currentSlotStockAmount: number
  action: string
  was_created?: boolean
  amount_added?: number
}

interface TransactionDetail {
  transaction_detail_id: number
  transaction_id: number
  product_id: string
  slot_stock_id: number
  slot_id: number
  amount: number
  created_at: string
  Transaction: {
    transaction_id: number
    user_id: string
    activity: string
    status: string
    User: {
      first_name: string
      last_name: string
      Location: {
        location_name: string
        Group_Location: {
          group_location_name: string
        }
      }
    }
  }
  Product: {
    product_id: string
    product_name: string
  }
  Slot_stock: {
    slot_id: number
    lot_id: string
    amount: number
  }
  Slot: {
    slot_id: number
    locker_id: number
    capacity: number
    Locker: {
      locker_id: number
      locker_location_detail: string
      Location: {
        location_name: string
        Group_Location: {
          group_location_name: string
        }
      }
    }
  }
}

interface Snapshot {
  snapshot_id: number
  image_path: string  // Cloudinary URL
  camera_id: number
  created_at: string
  Transaction_detail: {
    Product: {
      product_name: string
    }
    Slot: {
      slot_id: number
    }
  }
}

interface Location {
  location_id: number
  location_name: string
  group_location_id: number
  Group_Location?: {
    group_location_id: number
    group_location_name: string
  }
}

interface GroupLocation {
  group_location_id: number
  group_location_name: string
}

// ✅ แก้ไข Interfaces ให้ตรงกับ Backend Response

interface ReportItem {
  product_id: string
  product_name: string
  total_restock: number
  total_withdraw: number
  current_stock: number
}

interface DetailedTransactionItem {
  product_id: string
  product_name: string
  lot_id: string
  slot_id: number
  locker_id: number
  locker_detail: string
  amount: number
}

interface DetailedTransaction {
  transaction_id: number
  user_id: string
  user_name: string
  user_role: string
  activity: string
  status: string
  location_name: string
  group_location_name: string
  created_at: string
  items: DetailedTransactionItem[]
  total_amount: number
}

interface ReportFilters {
  user_ids: string[]
  user_names: string[]
  product_ids: string[]
  product_names: string[]
}

interface ReportSummary {
  total_products: number
  total_restock_all: number
  total_withdraw_all: number
  total_current_stock: number
  total_transactions: number
  total_transaction_items: number
  total_restock_transactions: number
  total_withdraw_transactions: number
}

interface ReportData {
  location_name: string
  group_location_name: string
  start_date: string
  end_date: string
  generated_at: string
  filters: ReportFilters
  summary_items: ReportItem[]
  detailed_transactions: DetailedTransaction[]
  summary: ReportSummary
}

// ✅ Multi-select Checkbox Component with Search
interface MultiSelectCheckboxProps {
  items: Array<{ id: string; name: string; subtitle?: string }>
  selectedIds: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
  searchPlaceholder: string
  emptyMessage: string
}

const MultiSelectCheckbox: React.FC<MultiSelectCheckboxProps> = ({
  items,
  selectedIds,
  onToggle,
  onToggleAll,
  searchPlaceholder,
  emptyMessage
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const allSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.includes(item.id))
  const someSelected = filteredItems.some(item => selectedIds.includes(item.id))

  return (
    <div className="border rounded-md">
      {/* Search Bar */}
      <div className="p-2 border-b bg-gray-50">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      </div>

      {/* Select All */}
      <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(input) => {
            if (input) {
              input.indeterminate = someSelected && !allSelected
            }
          }}
          onChange={onToggleAll}
          className="w-4 h-4 rounded border-gray-300"
        />
        <Label className="text-sm font-semibold cursor-pointer" onClick={onToggleAll}>
          เลือกทั้งหมด ({selectedIds.length}/{items.length})
        </Label>
      </div>

      {/* Items List */}
      <div className="max-h-[200px] overflow-y-auto">
        {filteredItems.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">{emptyMessage}</p>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-2 hover:bg-gray-50 flex items-center gap-2 cursor-pointer border-b last:border-b-0"
              onClick={() => onToggle(item.id)}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => onToggle(item.id)}
                className="w-4 h-4 rounded border-gray-300"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                {item.subtitle && (
                  <p className="text-xs text-gray-500">{item.subtitle}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}



export default function TransactionDetailTestPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
  const router = useRouter()

  // ✅ เพิ่ม state สำหรับ current user
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionDetails, setTransactionDetails] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [userLockerGrants, setUserLockerGrants] = useState<any[]>([])


  // ✅ State สำหรับ Report
  const [locations, setLocations] = useState<Location[]>([])
  const [groupLocations, setGroupLocations] = useState<GroupLocation[]>([])
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)

  const [filteredUsers, setFilteredUsers] = useState<{ searchTerm: string }>({ searchTerm: '' })
  const [filteredProducts, setFilteredProducts] = useState<{ searchTerm: string }>({ searchTerm: '' })


  const [reportForm, setReportForm] = useState({
    location_id: "",
    group_location_id: "",
    start_date: "",
    end_date: "",
    user_ids: [] as string[],      // ✅ เปลี่ยนเป็น array
    product_ids: [] as string[],   // ✅ เปลี่ยนเป็น array
  })
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false)

  const [selectedSnapshots, setSelectedSnapshots] = useState<Snapshot[]>([])
  const [isSnapshotDialogOpen, setIsSnapshotDialogOpen] = useState(false)
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  // Current Transaction State
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null)
  const [currentActivity, setCurrentActivity] = useState<string>("")
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Dialogs
  const [isCreateTransactionDialogOpen, setIsCreateTransactionDialogOpen] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isTransactionDetailDialogOpen, setIsTransactionDetailDialogOpen] = useState(false)

  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail[] | null>(null);


  // Loading states
  const [createTransactionLoading, setCreateTransactionLoading] = useState(false)
  const [addItemLoading, setAddItemLoading] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')

  const [filteredUsersForReport, setFilteredUsersForReport] = useState<any[]>([])

  // Forms
  const [createTransactionForm, setCreateTransactionForm] = useState({
    user_id: "",
    activity: "",
  })

  const [addItemForm, setAddItemForm] = useState({
    product_id: "",
    lot_id: "",
    slot_id: "",
    amount: "",
    expired_at: "",
  })

  // ฟังก์ชัน toggle expand/collapse
  const toggleRowExpansion = (transactionId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId)
      } else {
        newSet.add(transactionId)
      }
      return newSet
    })
  }

  // ✅ 1. ย้าย fetchUsersForReport มาไว้ที่นี่ (นอก useEffect)
  const fetchUsersForReport = async (locationId?: string, groupLocationId?: string) => {
    try {
      let response

      if (locationId) {
        response = await apiClient.get(`${API_URL}/user/getUsersByLocation?location_id=${locationId}`)
      } else if (groupLocationId) {
        response = await apiClient.get(`${API_URL}/user/getUsersByGroup?group_location_id=${groupLocationId}`)
      } else {
        setFilteredUsersForReport([])
        return
      }

      setFilteredUsersForReport(Array.isArray(response.data.users) ? response.data.users : [])
    } catch (error) {
      console.error('Error fetching users for report:', error)
      setFilteredUsersForReport([])
    }
  }

  useEffect(() => {
    if (isReportDialogOpen) {
      fetchUsersForReport(reportForm.location_id, reportForm.group_location_id)
    }
  }, [reportForm.location_id, reportForm.group_location_id, isReportDialogOpen])

  // ✅ useEffect สำหรับ Authentication และ Initialization
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

    // Role 4 ไม่มีสิทธิ์เข้าถึง (ถ้ามี role 4)
    if (user.role === 4) {
      router.push('/dashboard');
      return;
    }

    // ✅ 2. เพิ่มฟังก์ชันดึง snapshots
    const fetchTransactionSnapshots = async (transaction_id: number) => {
      try {
        setIsLoadingSnapshots(true)

        const response = await apiClient.get(
          `${API_URL}/snapshot/getSnapshotsByTransaction/${transaction_id}`
        )

        console.log('📸 Fetched snapshots:', response.data.snapshots)

        setSelectedSnapshots(response.data.snapshots || [])
        setIsSnapshotDialogOpen(true)

      } catch (error) {
        console.error('Error fetching snapshots:', error)
        alert('ไม่สามารถโหลดรูปภาพได้')
      } finally {
        setIsLoadingSnapshots(false)
      }
    }

    console.log('✅ User authenticated:', {
      role: user.role,
      groupLocationId: user.groupLocationId,
      locationId: user.locationId
    })

    // Fetch data
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchTransactions(),
          fetchTransactionDetails(),
          fetchProducts(),
          fetchSlots(),
          fetchUserLockerGrants(),
          fetchUsers(),
          fetchLocationsForReport() // ✅ เพิ่ม fetch locations สำหรับ report
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    fetchData();
  }, [])

  // ✅ Fetch locations สำหรับ Report Dialog
  const fetchLocationsForReport = async () => {
    try {
      const user = authService.getUser()

      if (user.role === 1) {
        // System Admin - ดึง Group Locations ทั้งหมด
        const groupResponse = await apiClient.get(`${API_URL}/grouplocation/getAllGrouplocations`)
        setGroupLocations(Array.isArray(groupResponse.data.groupLocations) ? groupResponse.data.groupLocations : [])

        // ดึง Locations ทั้งหมด
        const locResponse = await apiClient.get(`${API_URL}/location/getAllLocations`)
        setLocations(Array.isArray(locResponse.data.locations) ? locResponse.data.locations : [])

      } else if (user.role === 2) {
        // Organize Admin - ดึง Locations ตาม group_location_id
        const response = await apiClient.get(
          `${API_URL}/location/getLocationsByGroup?group_location_id=${user.groupLocationId}`
        )
        setLocations(Array.isArray(response.data.locations) ? response.data.locations : [])

      } else if (user.role === 3) {
        // Department Admin - ใช้ location ของตัวเองอัตโนมัติ
        // ไม่ต้องดึง locations เพิ่มเติม
      }
    } catch (error) {
      console.error('Fetch locations for report error:', error)
    }
  }

  // ✅ แก้ไข fetchTransactions ให้เรียก API ตาม role
  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const user = authService.getUser()

      console.log('🔍 Fetching transactions for user:', {
        role: user.role,
        groupLocationId: user.groupLocationId,
        locationId: user.locationId
      })

      let response

      // เรียก API ตาม role (แบบเดียวกับ location-management)
      if (user.role === 1) {
        // System Admin - เห็นทั้งหมด
        response = await apiClient.get(`${API_URL}/transaction/getAllTransactions`)

      } else if (user.role === 2) {
        // Organize Admin - เห็นตาม group_location_id
        response = await apiClient.get(
          `${API_URL}/transaction/getTransactionsByGroup?group_location_id=${user.groupLocationId}`
        )

      } else if (user.role === 3) {
        // Department Admin - เห็นตาม location_id
        response = await apiClient.get(
          `${API_URL}/transaction/getTransactionsByLocation?location_id=${user.locationId}`
        )

      } else {
        // Role อื่นๆ ไม่มีสิทธิ์
        setTransactions([])
        return
      }

      // จัดการข้อมูลที่ได้รับ
      const transactionsData = Array.isArray(response.data.transactions)
        ? response.data.transactions
        : []

      console.log('✅ Fetched transactions:', transactionsData.length)
      setTransactions(transactionsData)

    } catch (error: any) {
      console.error('Fetch transactions error:', error)

      // จัดการ error แบบเฉพาะเจาะจง
      if (error.response?.status === 403) {
        setError('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
      } else if (error.response?.status === 401) {
        setError('กรุณาเข้าสู่ระบบใหม่')
        router.push('/signin')
      } else if (error.response?.status === 404) {
        setError('ไม่พบข้อมูล Transaction')
        setTransactions([])
      } else {
        setError('ไม่สามารถดึงข้อมูล Transaction ได้')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTransactionDetails = async () => {
    try {
      const response = await apiClient.get(`${API_URL}/transactionDetail/getAllTransactionDetails`)

      const data = response.data
      setTransactionDetails(Array.isArray(data.details) ? data.details : [])
    } catch (error) {
      console.error('Fetch transaction details error:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get(`${API_URL}/user/getAllUsers`)

      const data = response.data
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (error) {
      console.error('Fetch users error:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get(`${API_URL}/product/getAllProducts`)

      const data = response.data
      setProducts(Array.isArray(data.products) ? data.products : [])
    } catch (error) {
      console.error('Fetch products error:', error)
    }
  }

  // ✅ 2. เพิ่มฟังก์ชันดึง snapshots
  const fetchTransactionSnapshots = async (transaction_id: number) => {
    try {
      setIsLoadingSnapshots(true)

      const response = await apiClient.get(
        `${API_URL}/snapshot/getSnapshotsByTransaction/${transaction_id}`
      )

      console.log('📸 Fetched snapshots:', response.data.snapshots)

      setSelectedSnapshots(response.data.snapshots || [])
      setIsSnapshotDialogOpen(true)

    } catch (error) {
      console.error('Error fetching snapshots:', error)
      alert('ไม่สามารถโหลดรูปภาพได้')
    } finally {
      setIsLoadingSnapshots(false)
    }
  }

  const fetchSlots = async () => {
    try {
      const response = await apiClient.get(`${API_URL}/slot/getAllSlot`)

      const data = response.data
      setSlots(Array.isArray(data.slots) ? data.slots : [])
    } catch (error) {
      console.error('Fetch slots error:', error)
    }
  }

  const fetchUserLockerGrants = async () => {
    try {
      const response = await apiClient.get(`${API_URL}/userLockerGrant/getAllUserLockerGrant`)

      const data = response.data
      setUserLockerGrants(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Fetch user locker grants error:', error)
    }
  }

  // ========================================
  // ตรวจสอบสิทธิ์ของ User
  // ========================================
  const checkUserPermission = (userId: string, activity: string): boolean => {
    // หา UserLockerGrant ของ user นี้
    const userGrant = userLockerGrants.find(grant => grant.user_id === userId)

    if (!userGrant) {
      setPermissionError('ไม่พบสิทธิ์การเข้าถึงตู้ของผู้ใช้นี้')
      return false
    }

    // เช็คสิทธิ์ตาม activity
    if (activity === 'เบิกยา') {
      if (userGrant.permission_withdraw !== 1) {
        setPermissionError('ผู้ใช้นี้ไม่มีสิทธิ์ในการเบิกยา (permission_withdraw = 0)')
        return false
      }
    } else if (activity === 'เติมยา') {
      if (userGrant.permission_restock !== 1) {
        setPermissionError('ผู้ใช้นี้ไม่มีสิทธิ์ในการเติมยา (permission_restock = 0)')
        return false
      }
    }

    setPermissionError(null)
    return true
  }

  const handleViewTransactionDetail = async (transaction_id: number) => {
    try {
      const response = await apiClient.get(
        `${API_URL}/transactionDetail/getTransactionDetailByTransactionId/${transaction_id}`
      );

      const data = response.data
      setSelectedTransaction(data);
      setIsTransactionDetailDialogOpen(true);

    } catch (error) {
      console.error('Error fetching transaction details:', error);
    }
  };

  // ========================================
  // 1. สร้าง Transaction ใหม่
  // ========================================
  const handleCreateTransaction = async () => {
    try {
      setCreateTransactionLoading(true)
      setPermissionError(null)

      // เช็คสิทธิ์ก่อนสร้าง Transaction
      const hasPermission = checkUserPermission(
        createTransactionForm.user_id,
        createTransactionForm.activity
      )

      if (!hasPermission) {
        setCreateTransactionLoading(false)
        return
      }

      const response = await apiClient.post(`${API_URL}/transaction/createTransaction`, {
        user_id: createTransactionForm.user_id,
        activity: createTransactionForm.activity,
        status: "กำลังดำเนินการ"
      })

      const data = response.data

      // Set current transaction
      setCurrentTransactionId(data.transaction.transaction_id)
      setCurrentActivity(data.transaction.activity)
      setCartItems([])

      await fetchTransactions()
      setIsCreateTransactionDialogOpen(false)
      setCreateTransactionForm({ user_id: "", activity: "" })
      alert(`สร้าง Transaction สำเร็จ! ID: ${data.transaction.transaction_id}`)

    } catch (error: any) {
      console.error('Error creating transaction:', error)
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`)
    } finally {
      setCreateTransactionLoading(false)
    }
  }

  // ========================================
  // 2. เพิ่มรายการยาในตะกร้า
  // ========================================
  const handleAddItemToCart = async () => {
    if (!currentTransactionId) {
      alert('กรุณาสร้าง Transaction ก่อน')
      return
    }

    try {
      setAddItemLoading(true)

      const response = await apiClient.post(`${API_URL}/transactionDetail/addItemToCart`, {
        transaction_id: currentTransactionId,
        product_id: addItemForm.product_id,
        lot_id: addItemForm.lot_id,
        slot_id: addItemForm.slot_id,
        amount: parseInt(addItemForm.amount),
        expired_at: addItemForm.expired_at || null
      })

      const data = response.data

      // เพิ่มรายการในตะกร้า
      const newCartItem: CartItem = {
        slot_stock_id: data.data.slot_stock_id,
        product_id: data.data.product_id,
        lot_id: data.data.lot_id,
        slot_id: parseInt(data.data.slot_id),
        amount: data.data.amount,
        currentSlotStockAmount: data.data.currentSlotStockAmount,
        action: data.data.action,
        was_created: data.data.action === 'สร้าง slot_stock ใหม่',
        amount_added: data.data.amount
      }

      setCartItems([...cartItems, newCartItem])

      setIsAddItemDialogOpen(false)
      setAddItemForm({
        product_id: "",
        lot_id: "",
        slot_id: "",
        amount: "",
        expired_at: ""
      })


    } catch (error: any) {
      console.error('Error adding item:', error)
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`)
    } finally {
      setAddItemLoading(false)
    }
  }

  // ========================================
  // 3. ลบรายการจากตะกร้า
  // ========================================
  const handleRemoveCartItem = async (item: CartItem, index: number) => {
    if (!currentTransactionId) {
      alert('ไม่พบ Transaction ID')
      return
    }

    try {
      console.log('Removing item from cart:', {
        transaction_id: currentTransactionId,
        slot_stock_id: item.slot_stock_id,
        amount_to_remove: item.amount_added || item.amount,
        was_created: item.was_created
      })

      const response = await apiClient.post(`${API_URL}/transactionDetail/removeItemFromTempCart`, {
        transaction_id: currentTransactionId,
        slot_stock_id: item.slot_stock_id,
        amount_to_remove: item.amount_added || item.amount,
        was_created: item.was_created
      })

      const data = response.data

      // ลบออกจาก cartItems
      const newCartItems = cartItems.filter((_, i) => i !== index)
      setCartItems(newCartItems)

      alert('ลบรายการออกจากตะกร้าสำเร็จ')

    } catch (error: any) {
      console.error('Error removing item:', error)
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`)
    }
  }

  // ========================================
  // 4. ยืนยัน Transaction
  // ========================================
  const handleConfirmTransaction = async () => {
    if (!currentTransactionId || cartItems.length === 0) {
      alert('ไม่มีรายการในตะกร้า')
      return
    }

    try {
      setConfirmLoading(true)

      const items = cartItems.map(item => ({
        slot_stock_id: item.slot_stock_id,
        product_id: item.product_id,
        slot_id: item.slot_id,
        amount: item.amount_added || item.amount
      }))

      const response = await apiClient.post(`${API_URL}/transactionDetail/confirmTransaction`, {
        transaction_id: currentTransactionId,
        items: items
      })

      const data = response.data

      // Reset state
      setCurrentTransactionId(null)
      setCurrentActivity("")
      setCartItems([])

      await fetchTransactions()
      await fetchTransactionDetails()

      setIsConfirmDialogOpen(false)
      alert('ยืนยันรายการสำเร็จ')

    } catch (error: any) {
      console.error('Error confirming transaction:', error)
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`)
    } finally {
      setConfirmLoading(false)
    }
  }

  // ========================================
  // 5. ยกเลิก Transaction
  // ========================================
  const handleCancelTransaction = async () => {
    if (!currentTransactionId) {
      alert('ไม่มี Transaction ที่เปิดอยู่')
      return
    }

    try {
      setCancelLoading(true)
      const rollbackItems = cartItems.map(item => ({
        slot_stock_id: item.slot_stock_id,
        amount_to_rollback: item.amount_added || item.amount,
        was_created: item.was_created,
        slot_id: item.slot_id,
        product_id: item.product_id,
        lot_id: item.lot_id,

      }))

      console.log('Canceling transaction:', {
        transaction_id: currentTransactionId,
        rollback_items: rollbackItems,
        endpoint: `${API_URL}/transactionDetail/cancelTransaction`
      })

      const response = await apiClient.post(`${API_URL}/transactionDetail/cancelTransaction`, {
        transaction_id: currentTransactionId,
        rollback_items: rollbackItems
      })

      const data = response.data

      // Reset state
      setCurrentTransactionId(null)
      setCurrentActivity("")
      setCartItems([])

      await fetchTransactions()

      setIsCancelDialogOpen(false)
      alert('ยกเลิกรายการสำเร็จ')

    } catch (error: any) {
      console.error('Error canceling transaction:', error)
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`)
    } finally {
      setCancelLoading(false)
    }
  }

  // ========================================
  // ✅ ฟังก์ชันสำหรับออกใบรีพอร์ต
  // ========================================

  // เปิด Dialog ออกใบรีพอร์ต
  const handleOpenReportDialog = () => {
    // Reset form
    setReportForm({
      location_id: "",
      group_location_id: "",
      start_date: "",
      end_date: "",
      user_ids: [],      // reset เป็น array ว่าง
      product_ids: [],   // reset เป็น array ว่าง
    })
    setUserSearchTerm('')       // ✅ reset search
    setProductSearchTerm('')    // ✅ reset search
    setFilteredUsersForReport([])
    setReportData(null)
    setIsReportDialogOpen(true)
  }

  const handleFetchReportData = async () => {
    try {
      setReportLoading(true)

      let queryParams = ''
      const params: string[] = []

      if (reportForm.start_date) params.push(`start_date=${reportForm.start_date}`)
      if (reportForm.end_date) params.push(`end_date=${reportForm.end_date}`)

      if (currentUser?.role === 3) {
        params.push(`location_id=${currentUser.locationId}`)
      } else if (reportForm.location_id) {
        params.push(`location_id=${reportForm.location_id}`)
      } else if (reportForm.group_location_id) {
        params.push(`group_location_id=${reportForm.group_location_id}`)
      }

      if (reportForm.user_ids.length > 0) {
        params.push(`user_ids=${reportForm.user_ids.join(',')}`)
      }
      if (reportForm.product_ids.length > 0) {
        params.push(`product_ids=${reportForm.product_ids.join(',')}`)
      }

      queryParams = params.join('&')

      const response = await apiClient.get(`${API_URL}/transaction/getReportData?${queryParams}`)
      setReportData(response.data.report)
      setReportPreviewOpen(true)
    } catch (error: any) {
      console.error('Error fetching report data:', error)
      alert(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`)
    } finally {
      setReportLoading(false)
    }
  }

  // สร้างและดาวน์โหลด CSV
  const handleDownloadCSV = () => {
    if (!reportData || !currentUser) {
      alert('ไม่มีข้อมูลสำหรับสร้างรีพอร์ต')
      return
    }

    const reporterName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'ไม่ระบุ'

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    const generatedDate = new Date().toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    let csvContent = ''

    // ========================================
    // HEADER
    // ========================================
    csvContent += 'รายงานสรุปการเบิก-เติมยา\n'
    csvContent += `สถานที่,${reportData.location_name}\n`
    csvContent += `กลุ่มสถานที่,${reportData.group_location_name}\n`
    csvContent += `ช่วงเวลา,${formatDate(reportData.start_date)} - ${formatDate(reportData.end_date)}\n`
    csvContent += `ผู้ออกรีพอร์ต,${reporterName}\n`
    csvContent += `วันที่ออกรีพอร์ต,${generatedDate}\n`

    // ✅ Filter info
    if (reportData.filters?.user_names) {
      csvContent += `ผู้ทำรายการ,${reportData.filters.user_names}\n`
    }
    if (reportData.filters?.product_names) {
      csvContent += `รายการยา,${reportData.filters.product_names}\n`
    }

    csvContent += '\n'

    // ========================================
    // SECTION 1: SUMMARY (by product)
    // ========================================
    csvContent += '=== สรุปรวมตามยา ===\n'
    csvContent += 'ลำดับ,รหัสยา,ชื่อยา,จำนวนเติมยา,จำนวนเบิกยา,จำนวนคงเหลือ\n'

    if (reportData.summary_items && reportData.summary_items.length > 0) {
      reportData.summary_items.forEach((item: any, index: number) => {
        csvContent += `${index + 1},${item.product_id},${item.product_name},${item.total_restock},${item.total_withdraw},${item.current_stock}\n`
      })
    } else {
      csvContent += 'ไม่มีข้อมูล\n'
    }

    csvContent += '\n'

    // ========================================
    // SECTION 2: DETAILED TRANSACTIONS
    // ========================================
    csvContent += '=== รายละเอียดการทำรายการ ===\n'

    if (reportData.detailed_transactions && reportData.detailed_transactions.length > 0) {
      reportData.detailed_transactions.forEach((transaction: any, idx: number) => {
        csvContent += `\nTransaction #${idx + 1}\n`
        csvContent += `Transaction ID,${transaction.transaction_id}\n`
        csvContent += `ผู้ทำรายการ,${transaction.user_name} (${transaction.user_role})\n`
        csvContent += `กิจกรรม,${transaction.activity}\n`
        csvContent += `สถานที่,${transaction.location_name}\n`
        csvContent += `กลุ่มสถานที่,${transaction.group_location_name}\n`
        csvContent += `วันที่,${new Date(transaction.created_at).toLocaleString('th-TH')}\n`
        csvContent += `จำนวนรวม,${transaction.total_amount} ชิ้น\n`
        csvContent += '\nรายการสินค้า:\n'
        csvContent += 'ลำดับ,ชื่อยา,รหัสยา,Lot ID,Slot,Locker,จำนวน\n'

        transaction.items.forEach((item: any, i: number) => {
          csvContent += `${i + 1},${item.product_name},${item.product_id},${item.lot_id},Slot #${item.slot_id},Locker #${item.locker_id},${item.amount}\n`
        })
      })
    } else {
      csvContent += 'ไม่มีรายการทำรายการ\n'
    }

    csvContent += '\n'

    // ========================================
    // SUMMARY
    // ========================================
    csvContent += '=== สรุปภาพรวม ===\n'
    csvContent += `จำนวนรายการยาทั้งหมด,${reportData.summary?.total_products || 0} รายการ\n`
    csvContent += `จำนวนเติมยารวม,${reportData.summary?.total_restock_all || 0} ชิ้น (${reportData.summary?.total_restock_transactions || 0} ครั้ง)\n`
    csvContent += `จำนวนเบิกยารวม,${reportData.summary?.total_withdraw_all || 0} ชิ้น (${reportData.summary?.total_withdraw_transactions || 0} ครั้ง)\n`
    csvContent += `จำนวนคงเหลือรวม,${reportData.summary?.total_current_stock || 0} ชิ้น\n`
    csvContent += `จำนวน Transaction ทั้งหมด,${reportData.summary?.total_transactions || 0} รายการ\n`
    csvContent += `จำนวนรายการสินค้าทั้งหมด,${reportData.summary?.total_transaction_items || 0} รายการ\n`

    // ========================================
    // DOWNLOAD
    // ========================================
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    const startDateFormatted = reportData.start_date.replace(/-/g, '')
    const endDateFormatted = reportData.end_date.replace(/-/g, '')

    let filename = `รายงานยา_${reportData.location_name}_${startDateFormatted}-${endDateFormatted}`

    if (reportData.filters?.user_names) {
      filename += `_${reportData.filters.user_names}`
    }
    if (reportData.filters?.product_names) {
      filename += `_${reportData.filters.product_names}`
    }

    filename += '.csv'

    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    alert('ดาวน์โหลดรีพอร์ต CSV สำเร็จ')
  }

  // ✅ สร้างและดาวน์โหลด PDF (รองรับภาษาไทย)
  // ✅ PDF Generation - แสดงทั้ง Summary และ Detailed ในรีพอร์ตเดียว
  const handleDownloadPDF = () => {
    if (!reportData || !currentUser) {
      alert('ไม่มีข้อมูลสำหรับสร้างรีพอร์ต')
      return
    }

    // สร้าง PDF document
    const doc = new jsPDF('p', 'mm', 'a4')

    // ⭐ เพิ่ม Thai Font (THSarabunNew)
    try {
      if (typeof thSarabunBase64 !== 'undefined' && thSarabunBase64.length > 100) {
        doc.addFileToVFS("Kanit-Regular.ttf", thSarabunBase64)
        doc.addFont("Kanit-Regular.ttf", "Kanit-Regular", "normal")
        doc.setFont("Kanit-Regular")
        console.log('✅ Thai font loaded successfully')
      } else {
        doc.setFont('Helvetica')
        console.warn('⚠️ Thai font not loaded, using Helvetica')
      }
    } catch (error) {
      console.error('❌ Error loading Thai font:', error)
      doc.setFont('Helvetica')
    }

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15

    // ชื่อผู้ออกรีพอร์ต
    const reporterName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'N/A'

    // Format วันที่
    const formatDateThai = (dateStr: string) => {
      const date = new Date(dateStr)
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    // ========================================
    // HEADER SECTION
    // ========================================

    // Background header
    doc.setFillColor(59, 130, 246) // Blue
    doc.rect(0, 0, pageWidth, 50, 'F')

    // Title
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text('รายงานสรุปการเบิก-เติมยา', pageWidth / 2, 20, { align: 'center' })

    doc.setFontSize(14)
    doc.text('ระบบตู้เก็บยาอัจฉริยะ', pageWidth / 2, 30, { align: 'center' })

    // Period
    doc.setFontSize(11)
    doc.text(
      `ช่วงเวลา: ${formatDateThai(reportData.start_date)} - ${formatDateThai(reportData.end_date)}`,
      pageWidth / 2,
      40,
      { align: 'center' }
    )

    // ========================================
    // INFO SECTION
    // ========================================
    let yPos = 60

    // Info box
    doc.setFillColor(248, 250, 252) // Light gray
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 40, 3, 3, 'FD')

    doc.setTextColor(71, 85, 105) // Gray
    doc.setFontSize(10)

    // Left column
    doc.setFont('Kanit-Regular', 'normal')
    doc.text('สถานที่:', margin + 5, yPos + 10)
    doc.text('กลุ่มสถานที่:', margin + 5, yPos + 18)
    doc.text('ผู้ออกรีพอร์ต:', margin + 5, yPos + 26)

    doc.setFont('Kanit-Regular', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.text(reportData.location_name || 'N/A', margin + 35, yPos + 10)
    doc.text(reportData.group_location_name || 'N/A', margin + 35, yPos + 18)
    doc.text(reporterName, margin + 35, yPos + 26)

    // Right column
    doc.setTextColor(71, 85, 105)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text('วันที่ออกรีพอร์ต:', pageWidth / 2 + 10, yPos + 10)
    doc.text('จำนวนรายการยา:', pageWidth / 2 + 10, yPos + 18)

    doc.setFont('Kanit-Regular', 'normal')
    doc.setTextColor(30, 41, 59)
    doc.text(new Date().toLocaleDateString('th-TH'), pageWidth / 2 + 45, yPos + 10)
    doc.text(`${reportData.summary?.total_products || 0} รายการ`, pageWidth / 2 + 45, yPos + 18)

    // ✅ แสดง Filter Info (ถ้ามี)
    if (reportData.filters?.user_names || reportData.filters?.product_names) {
      doc.setFont('Kanit-Regular', 'normal')
      doc.setTextColor(71, 85, 105)


    }

    yPos += 50

    // ========================================
    // SECTION 1: SUMMARY TABLE (by product)
    // ========================================

    // Section header
    doc.setFillColor(59, 130, 246)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text('📊 สรุปรวมตามยา', margin, yPos)
    yPos += 5

    // Prepare summary table data
    if (reportData.summary_items && reportData.summary_items.length > 0) {
      const summaryTableData = reportData.summary_items.map((item: any, index: number) => [
        (index + 1).toString(),
        item.product_id,
        item.product_name,
        item.total_restock.toString(),
        item.total_withdraw.toString(),
        item.current_stock.toString()
      ])

      // Generate summary table
      autoTable(doc, {
        startY: yPos,
        head: [['ลำดับ', 'รหัสยา', 'ชื่อยา', 'เติมยา', 'เบิกยา', 'คงเหลือ']],
        body: summaryTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          font: 'Kanit-Regular',
          fontStyle: 'normal',
          halign: 'center',
          fontSize: 10
        },
        bodyStyles: {
          font: 'Kanit-Regular',
          fontStyle: 'normal',
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'left', cellWidth: 'auto' },
          3: { halign: 'center', cellWidth: 22, fillColor: [220, 252, 231] }, // Green bg
          4: { halign: 'center', cellWidth: 22, fillColor: [254, 226, 226] }, // Red bg
          5: { halign: 'center', cellWidth: 22, fillColor: [219, 234, 254] }  // Blue bg
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: margin, right: margin }
      })

      yPos = (doc as any).lastAutoTable.finalY + 15
    } else {
      doc.setTextColor(128, 128, 128)
      doc.setFontSize(10)
      doc.text('ไม่มีข้อมูลสรุปยา', pageWidth / 2, yPos + 10, { align: 'center' })
      yPos += 25
    }

    // ========================================
    // SECTION 2: DETAILED TRANSACTIONS
    // ========================================

    // Check if need new page
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = 20
    }

    // Section header
    doc.setFillColor(34, 197, 94) // Green
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text('📋 รายละเอียดการทำรายการ', margin, yPos)
    yPos += 7

    if (reportData.detailed_transactions && reportData.detailed_transactions.length > 0) {
      reportData.detailed_transactions.forEach((transaction: any, idx: number) => {
        // Check if need new page (reserve space for transaction header + at least 2 rows)
        if (yPos > pageHeight - 70) {
          doc.addPage()
          yPos = 20
        }

        // Transaction header bar
        const activityColor = transaction.activity === 'เบิกยา'
          ? [239, 68, 68]   // Red
          : [34, 197, 94]   // Green

        doc.setFillColor(activityColor[0], activityColor[1], activityColor[2])
        doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 14, 2, 2, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont('Kanit-Regular', 'normal')

        // Transaction info on header
        const transactionHeader = `#${idx + 1} - Transaction ID: ${transaction.transaction_id} | ${transaction.activity}`
        doc.text(transactionHeader, margin + 2, yPos + 5)

        const transactionSubHeader = `👤 ${transaction.user_name} | 📍 ${transaction.location_name} | รวม: ${transaction.total_amount} ชิ้น`
        doc.setFontSize(8)
        doc.text(transactionSubHeader, margin + 2, yPos + 10)

        yPos += 18

        // Prepare items table data for this transaction
        const itemsData = transaction.items.map((item: any, i: number) => [
          (i + 1).toString(),
          item.product_name,
          item.lot_id,
          `Slot #${item.slot_id}`,
          `Locker #${item.locker_id}`,
          item.amount.toString()
        ])

        // Generate items table
        autoTable(doc, {
          startY: yPos,
          head: [['#', 'ชื่อยา', 'Lot ID', 'Slot', 'Locker', 'จำนวน']],
          body: itemsData,
          theme: 'grid',
          headStyles: {
            fillColor: [226, 232, 240],
            textColor: [30, 41, 59],
            font: 'Kanit-Regular',
            fontStyle: 'normal',
            fontSize: 9,
            halign: 'center'
          },
          bodyStyles: {
            font: 'Kanit-Regular',
            fontStyle: 'normal',
            fontSize: 8,
            cellPadding: 2
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left', cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 22 },
            5: {
              halign: 'center',
              cellWidth: 18,
              fillColor: transaction.activity === 'เบิกยา' ? [254, 226, 226] : [220, 252, 231]
            }
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          margin: { left: margin + 3, right: margin + 3 }
        })

        yPos = (doc as any).lastAutoTable.finalY + 10

        // Separator line
        if (idx < reportData.detailed_transactions.length - 1) {
          doc.setDrawColor(200, 200, 200)
          doc.line(margin, yPos, pageWidth - margin, yPos)
          yPos += 5
        }
      })
    } else {
      doc.setTextColor(128, 128, 128)
      doc.setFontSize(10)
      doc.text('ไม่มีรายการทำรายการในช่วงเวลานี้', pageWidth / 2, yPos + 10, { align: 'center' })
      yPos += 25
    }

    // ========================================
    // SUMMARY CARDS SECTION
    // ========================================

    // Check if need new page
    if (yPos > pageHeight - 50) {
      doc.addPage()
      yPos = 20
    } else {
      yPos += 5
    }

    const cardWidth = (pageWidth - (margin * 2) - 15) / 4
    const cardHeight = 28

    // Summary title
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(13)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text('📈 สรุปภาพรวม', margin, yPos)
    yPos += 8

    // Card 1: Total Products (Blue)
    doc.setFillColor(59, 130, 246)
    doc.roundedRect(margin, yPos, cardWidth, cardHeight, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text('จำนวนรายการยา', margin + cardWidth / 2, yPos + 8, { align: 'center' })
    doc.setFontSize(18)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text(
      (reportData.summary?.total_products || 0).toString(),
      margin + cardWidth / 2,
      yPos + 18,
      { align: 'center' }
    )
    doc.setFontSize(7)
    doc.text('รายการ', margin + cardWidth / 2, yPos + 24, { align: 'center' })

    // Card 2: Total Restock (Green)
    const card2X = margin + cardWidth + 5
    doc.setFillColor(34, 197, 94)
    doc.roundedRect(card2X, yPos, cardWidth, cardHeight, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text('จำนวนเติมยารวม', card2X + cardWidth / 2, yPos + 8, { align: 'center' })
    doc.setFontSize(18)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text(
      (reportData.summary?.total_restock_all || 0).toString(),
      card2X + cardWidth / 2,
      yPos + 18,
      { align: 'center' }
    )
    doc.setFontSize(7)
    doc.text(
      `${reportData.summary?.total_restock_transactions || 0} ครั้ง`,
      card2X + cardWidth / 2,
      yPos + 24,
      { align: 'center' }
    )

    // Card 3: Total Withdraw (Red)
    const card3X = margin + (cardWidth + 5) * 2
    doc.setFillColor(239, 68, 68)
    doc.roundedRect(card3X, yPos, cardWidth, cardHeight, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text('จำนวนเบิกยารวม', card3X + cardWidth / 2, yPos + 8, { align: 'center' })
    doc.setFontSize(18)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text(
      (reportData.summary?.total_withdraw_all || 0).toString(),
      card3X + cardWidth / 2,
      yPos + 18,
      { align: 'center' }
    )
    doc.setFontSize(7)
    doc.text(
      `${reportData.summary?.total_withdraw_transactions || 0} ครั้ง`,
      card3X + cardWidth / 2,
      yPos + 24,
      { align: 'center' }
    )

    // Card 4: Current Stock (Purple)
    const card4X = margin + (cardWidth + 5) * 3
    doc.setFillColor(139, 92, 246)
    doc.roundedRect(card4X, yPos, cardWidth, cardHeight, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text('จำนวนคงเหลือรวม', card4X + cardWidth / 2, yPos + 8, { align: 'center' })
    doc.setFontSize(18)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text(
      (reportData.summary?.total_current_stock || 0).toString(),
      card4X + cardWidth / 2,
      yPos + 18,
      { align: 'center' }
    )
    doc.setFontSize(7)
    doc.text('ชิ้น', card4X + cardWidth / 2, yPos + 24, { align: 'center' })

    yPos += cardHeight + 10

    // Additional summary info
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont('Kanit-Regular', 'normal')
    doc.text(
      `ทั้งหมด ${reportData.summary?.total_transactions || 0} รายการทำรายการ (${reportData.summary?.total_transaction_items || 0} รายการสินค้า)`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    )

    // ========================================
    // FOOTER (ใส่ทุกหน้า)
    // ========================================
    const totalPages = doc.getNumberOfPages()

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)

      doc.setTextColor(148, 163, 184)
      doc.setFontSize(8)
      doc.setFont('Kanit-Regular', 'normal')

      // Footer text
      doc.text(
        `สร้างเมื่อ ${new Date().toLocaleString('th-TH')} | ระบบตู้เก็บยาอัจฉริยะ`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )

      // Page number
      doc.text(
        `หน้า ${i} จาก ${totalPages}`,
        pageWidth - margin,
        pageHeight - 10,
        { align: 'right' }
      )
    }

    // ========================================
    // SAVE PDF
    // ========================================
    const startDateFormatted = reportData.start_date.replace(/-/g, '')
    const endDateFormatted = reportData.end_date.replace(/-/g, '')

    let filename = `รายงานยา_${reportData.location_name.replace(/\s+/g, '_')}_${startDateFormatted}-${endDateFormatted}`



    filename += '.pdf'

    doc.save(filename)

    alert('ดาวน์โหลดรีพอร์ต PDF สำเร็จ')
  }

  // ตรวจสอบว่าฟอร์มครบถ้วนหรือไม่
  const isReportFormValid = () => {
    if (!reportForm.start_date || !reportForm.end_date) {
      return true
    }

    // Role 3 ไม่ต้องเลือก location
    if (currentUser?.role === 3) {
      return true
    }

    // Role 1, 2 ต้องเลือก location หรือ group
    return !!(reportForm.location_id || reportForm.group_location_id)
  }

  // Get filtered locations based on selected group (for Role 1)
  const getFilteredLocations = () => {
    if (currentUser?.role === 1 && reportForm.group_location_id) {
      return locations.filter(loc =>
        loc.group_location_id === parseInt(reportForm.group_location_id)
      )
    }
    return locations
  }

  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.transaction_id?.toString().includes(searchTerm) ||
      transaction.User.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.User.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.activity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||

      transaction.items?.some((item: any) =>
        item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lot_id?.toLowerCase().includes(searchTerm.toLowerCase())

      ) ||

      (users.find(u => u.user_id === transaction.user_id)?.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    if (status === 'สำเร็จ' || status === 'success') {
      return <Badge className="bg-green-500">success</Badge>
    } else if (status === 'กำลังดำเนินการ') {
      return <Badge className="bg-yellow-500">กำลังดำเนินการ</Badge>
    } else {
      return <Badge variant="secondary">{status}</Badge>
    }
  }

  // ✅ แสดง loading state หากยังไม่มี currentUser
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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">ประวัติการทำรายการ</h1>
          <p className="text-gray-500">ประวัติการทำรายการ / รายละเอียดการทำรายการ</p>
        </div>
        {/* ✅ ปุ่มออกใบรีพอร์ต */}
        <Button
          onClick={handleOpenReportDialog}
          className="bg-green-600 hover:bg-green-700"
        >
          <FileText className="w-4 h-4 mr-2" />
          ออกใบรีพอร์ต
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {permissionError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <strong>ไม่มีสิทธิ์:</strong> {permissionError}
          </div>
        </div>
      )}

      {/* Current Transaction Info */}
      {currentTransactionId && (
        <Card className="mb-6 border-blue-500 border-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-blue-600">
                  Transaction ID: {currentTransactionId}
                </CardTitle>
                <CardDescription>
                  กิจกรรม: {currentActivity} | สถานะ: กำลังดำเนินการ
                </CardDescription>
              </div>
              <div className="space-x-2">
                <Button
                  onClick={() => setIsAddItemDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มรายการ
                </Button>
                <Button
                  onClick={() => setIsConfirmDialogOpen(true)}
                  disabled={cartItems.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  ยืนยัน
                </Button>
                <Button
                  onClick={() => setIsCancelDialogOpen(true)}
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  ยกเลิก
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-3">รายการในตะกร้า ({cartItems.length} รายการ)</h3>
            {cartItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">ยังไม่มีรายการในตะกร้า</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Lot ID</TableHead>
                    <TableHead>Slot ID</TableHead>
                    <TableHead>จำนวน</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.product_id}</TableCell>
                      <TableCell>{item.lot_id}</TableCell>
                      <TableCell>{item.slot_id}</TableCell>
                      <TableCell>{item.amount_added || item.amount}</TableCell>
                      <TableCell>
                        <Badge variant={item.was_created ? "default" : "secondary"}>
                          {item.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCartItem(item, index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">
            <Package className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
        </TabsList>


        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>รายการ Transactions</CardTitle>
                  <CardDescription>
                    จัดการและดูรายการธุรกรรมทั้งหมด
                  </CardDescription>
                </div>
              </div>
              <div>
                <div>

                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="ค้นหา Transaction..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                  <p className="text-gray-500 mt-2">กำลังโหลดข้อมูล...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>หมายเลขทำรายการ</TableHead>
                      <TableHead>ชื่อผู้ทำรายการ</TableHead>
                      <TableHead>กิจกรรม</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>วันที่ทำรายการ</TableHead>
                      <TableHead>การจัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">
                          ไม่พบข้อมูล Transaction
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions
                        .filter((transaction) => transaction.status === 'สำเร็จ' || transaction.status === 'success').map((transaction) => (
                          <React.Fragment key={transaction.transaction_id}>
                            {/* แถวหลัก */}
                            <TableRow key={transaction.transaction_id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {/* ปุ่มขยาย/ย่อ */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleRowExpansion(transaction.transaction_id)}
                                    className="p-0 h-6 w-6"
                                  >
                                    {expandedRows.has(transaction.transaction_id) ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </Button>
                                  {transaction.transaction_id}
                                </div>
                              </TableCell>
                              <TableCell>
                                {transaction.User?.first_name || "-"} {transaction.User?.last_name || "-"}
                              </TableCell>
                              <TableCell>
                                {transaction.activity}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(transaction.status)}
                              </TableCell>
                              <TableCell>
                                {new Date(transaction.created_at).toLocaleString('th-TH')}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewTransactionDetail(transaction.transaction_id)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    ดูรายละเอียด
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {/* ✅ ปุ่มดูรูปภาพ */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fetchTransactionSnapshots(transaction.transaction_id)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Camera className="w-4 h-4 mr-1" />
                                    ดูรูปภาพ
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* แถวขยาย - แสดงรายการยา */}
                            {expandedRows.has(transaction.transaction_id) && (
                              <TableRow>
                                <TableCell colSpan={6} className="bg-gray-50 p-4">
                                  <div className="space-y-2">
                                    {(() => {
                                      const transactionItems = transactionDetails.filter(
                                        (detail) => detail.transaction_id === transaction.transaction_id
                                      )
                                      return (
                                        <>
                                          <h4 className="font-semibold text-sm mb-3">
                                            รายการสินค้า ({transactionItems.length} รายการ)
                                          </h4>
                                          {transactionItems.length === 0 ? (
                                            <p className="text-gray-500 text-sm">ไม่มีรายการสินค้า</p>
                                          ) : (
                                            <Table>
                                              <TableHeader>
                                                <TableRow className="bg-white">
                                                  <TableHead className="w-[60px]">ลำดับ</TableHead>
                                                  <TableHead>ชื่อยา</TableHead>
                                                  <TableHead>Lot ID</TableHead>
                                                  <TableHead>Slot</TableHead>
                                                  <TableHead className="text-right">จำนวน</TableHead>
                                                  <TableHead className="text-right">คงเหลือ</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {transactionItems.map((item: any, index: number) => (
                                                  <TableRow key={index} className="bg-white">
                                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                                    <TableCell>
                                                      <div>
                                                        <p className="font-semibold">{item.Product?.product_name || 'N/A'}</p>
                                                        <p className="text-xs text-gray-500">{item.Product?.product_id || 'N/A'}</p>
                                                      </div>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Badge variant="outline">{item.Slot_stock?.lot_id || 'N/A'}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                      <span className="text-sm">Slot #{item.Slot?.slot_id || 'N/A'}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                      <Badge
                                                        variant={transaction.activity === 'เบิกยา' ? 'destructive' : 'default'}
                                                        className="font-semibold bg-blue-600"
                                                      >
                                                        {item.amount}
                                                      </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                      <span className="text-sm font-medium text-gray-600">
                                                        {item.Slot_stock?.amount || '0'}
                                                      </span>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          )}
                                        </>
                                      )
                                    })()}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE TRANSACTION DIALOG */}
      <Dialog open={isCreateTransactionDialogOpen} onOpenChange={setIsCreateTransactionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>สร้าง Transaction ใหม่</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลเพื่อเริ่มต้นการทำธุรกรรม
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="user_id">User ID *</Label>
              <Input
                id="user_id"
                value={createTransactionForm.user_id}
                onChange={(e) => {
                  setCreateTransactionForm({ ...createTransactionForm, user_id: e.target.value })
                  setPermissionError(null)
                }}
                placeholder="ใส่ User UUID"
              />
              {createTransactionForm.user_id && createTransactionForm.activity && (
                <div className="mt-2 text-sm">
                  {(() => {
                    const grant = userLockerGrants.find(g => g.user_id === createTransactionForm.user_id)
                    if (!grant) {
                      return (
                        <div className="text-red-600 flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          ไม่พบสิทธิ์การเข้าถึงตู้
                        </div>
                      )
                    }
                    const canWithdraw = grant.permission_withdraw === 1
                    const canRestock = grant.permission_restock === 1
                    const hasPermission = createTransactionForm.activity === 'เบิกยา' ? canWithdraw : canRestock

                    return (
                      <div className={`flex items-center gap-1 ${hasPermission ? 'text-green-600' : 'text-red-600'}`}>
                        {hasPermission ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            มีสิทธิ์ {createTransactionForm.activity}
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            ไม่มีสิทธิ์ {createTransactionForm.activity}
                          </>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="activity">กิจกรรม *</Label>
              <Select
                value={createTransactionForm.activity}
                onValueChange={(value) => {
                  setCreateTransactionForm({ ...createTransactionForm, activity: value })
                  setPermissionError(null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกกิจกรรม" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="เบิกยา">เบิกยา (Withdraw)</SelectItem>
                  <SelectItem value="เติมยา">เติมยา (Restock)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateTransactionDialogOpen(false)
                setPermissionError(null)
              }}
              disabled={createTransactionLoading}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleCreateTransaction}
              disabled={createTransactionLoading || !createTransactionForm.user_id || !createTransactionForm.activity}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createTransactionLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังสร้าง...</span>
                </div>
              ) : (
                'สร้าง Transaction'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD ITEM DIALOG */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>เพิ่มรายการยา</DialogTitle>
            <DialogDescription>
              เพิ่มยาในตะกร้าสำหรับ Transaction ID: {currentTransactionId}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="product_id">Product ID *</Label>
              <Select
                value={addItemForm.product_id}
                onValueChange={(value) => setAddItemForm({ ...addItemForm, product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสินค้า" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.product_id} value={product.product_id}>
                      {product.product_name} ({product.product_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lot_id">Lot ID *</Label>
              <Input
                id="lot_id"
                value={addItemForm.lot_id}
                onChange={(e) => setAddItemForm({ ...addItemForm, lot_id: e.target.value })}
                placeholder="เช่น LOT2025001"
              />
            </div>
            <div>
              <Label htmlFor="slot_id">Slot ID *</Label>
              <Select
                value={addItemForm.slot_id}
                onValueChange={(value) => setAddItemForm({ ...addItemForm, slot_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกช่อง" />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((slot) => (
                    <SelectItem key={slot.slot_id} value={slot.slot_id.toString()}>
                      Slot {slot.slot_id} (Capacity: {slot.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">จำนวน *</Label>
              <Input
                id="amount"
                type="number"
                value={addItemForm.amount}
                onChange={(e) => setAddItemForm({ ...addItemForm, amount: e.target.value })}
                placeholder="ใส่จำนวน"
              />
            </div>
            {currentActivity === 'เติมยา' && (
              <div>
                <Label htmlFor="expired_at">วันหมดอายุ {currentActivity === 'เติมยา' && '*'}</Label>
                <Input
                  id="expired_at"
                  type="date"
                  value={addItemForm.expired_at}
                  onChange={(e) => setAddItemForm({ ...addItemForm, expired_at: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddItemDialogOpen(false)}
              disabled={addItemLoading}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleAddItemToCart}
              disabled={addItemLoading || !addItemForm.product_id || !addItemForm.lot_id || !addItemForm.slot_id || !addItemForm.amount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {addItemLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังเพิ่ม...</span>
                </div>
              ) : (
                'เพิ่มรายการ'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DIALOG */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการทำรายการ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการยืนยัน Transaction ID: {currentTransactionId} ใช่หรือไม่?
              <br />
              <span className="text-blue-600 font-semibold">
                มีรายการทั้งหมด {cartItems.length} รายการ
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={confirmLoading}
            >
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmTransaction}
              disabled={confirmLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังยืนยัน...</span>
                </div>
              ) : (
                'ยืนยัน'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CANCEL DIALOG */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              ยืนยันการยกเลิก
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  คุณต้องการยกเลิก Transaction ID: {currentTransactionId} ใช่หรือไม่?
                </p>
                {cartItems.length > 0 && (
                  <div className="bg-gray-50 rounded-md p-3 mb-3 max-h-40 overflow-y-auto">
                    <p className="font-semibold text-sm mb-2 text-gray-700">รายการที่จะถูกยกเลิก:</p>
                    {cartItems.map((item, index) => (
                      <div key={item.slot_stock_id} className="text-sm text-gray-600 py-1">
                        {index + 1}. Product: {item.product_id}, Lot: {item.lot_id}, Slot: {item.slot_id}, จำนวน: {item.amount_added || item.amount}
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-600 font-semibold text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    การยกเลิกจะลบ Transaction และ rollback slot_stock ทั้งหมด
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={cancelLoading}
            >
              ไม่ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelTransaction}
              disabled={cancelLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังยกเลิก...</span>
                </div>
              ) : (
                'ยืนยันการยกเลิก'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transaction Detail Dialog */}
      <Dialog open={isTransactionDetailDialogOpen} onOpenChange={setIsTransactionDetailDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto ">
          <DialogHeader>
            <DialogTitle>รายละเอียดการทำรายการ</DialogTitle>
            <DialogDescription>
              ดูรายละเอียดและรายการสินค้าในการทำรายการ
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && selectedTransaction.length > 0 && (
            <div className="space-y-3">
              {/* Transaction Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ข้อมูลการทำรายการ</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="font-semibold">{selectedTransaction[0].Transaction.transaction_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">กิจกรรม</p>
                    <Badge variant={selectedTransaction[0].Transaction.activity === 'เบิกยา' ? 'destructive' : 'default'}>
                      {selectedTransaction[0].Transaction.activity}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ผู้ทำรายการ</p>
                    <p className="font-semibold">
                      {selectedTransaction[0].Transaction.User.first_name} {selectedTransaction[0].Transaction.User.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">สถานะ</p>
                    <Badge
                      variant={
                        selectedTransaction[0].Transaction.status === 'สำเร็จ' ? 'default' :
                          selectedTransaction[0].Transaction.status === 'กำลังดำเนินการ' ? 'secondary' :
                            'destructive'
                      }
                      className={selectedTransaction[0].Transaction.status === 'สำเร็จ' || selectedTransaction[0].Transaction.status === 'success' ? 'bg-green-500 hover:bg-green-600' : ''}
                    >
                      {selectedTransaction[0].Transaction.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">สถานที่</p>
                    <p className="font-semibold">
                      {selectedTransaction[0].Transaction.User.Location?.location_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">กลุ่มสถานที่</p>
                    <p className="font-semibold">
                      {selectedTransaction[0].Transaction.User.Location?.Group_Location?.group_location_name || 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">วันที่สร้าง</p>
                    <p className="font-semibold">
                      {new Date(selectedTransaction[0].created_at).toLocaleString('th-TH')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    รายการสินค้า ({selectedTransaction.length} รายการ)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">ลำดับ</TableHead>
                          <TableHead>สินค้า</TableHead>
                          <TableHead>Lot ID</TableHead>
                          <TableHead>Slot</TableHead>
                          <TableHead>ตำแหน่งตู้</TableHead>
                          <TableHead>สถานที่</TableHead>
                          <TableHead className="text-right" >จำนวน</TableHead>
                          <TableHead className="text-right">คงเหลือ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTransaction.map((detail, index) => (
                          <TableRow key={detail.transaction_detail_id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold">{detail.Product.product_name}</p>
                                <p className="text-xs text-gray-500">{detail.Product.product_id}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{detail.Slot_stock.lot_id}</Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">Slot #{detail.Slot.slot_id}</p>
                                <p className="text-xs text-gray-500">
                                  Capacity: {detail.Slot.capacity}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">Locker #{detail.Slot.Locker.locker_id}</p>
                                <p className="text-xs text-gray-500">
                                  {detail.Slot.Locker.locker_location_detail}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{detail.Slot.Locker.Location.location_name}</p>
                                <p className="text-xs text-gray-500">
                                  {detail.Slot.Locker.Location.Group_Location.group_location_name}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right" >
                              <Badge
                                variant={selectedTransaction[0].Transaction.activity === 'เบิกยา' ? 'destructive' : 'default'}
                                className="font-semibold bg-blue-700"
                              >
                                {detail.amount}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm font-medium text-gray-600">
                                {detail.Slot_stock.amount}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-1">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">จำนวนรายการ</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {selectedTransaction.length} รายการ
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">จำนวนรวม</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {selectedTransaction.reduce((sum, item) => sum + item.amount, 0)} ชิ้น
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ประเภท</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {selectedTransaction[0].Transaction.activity}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedTransaction && selectedTransaction.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">ไม่พบรายละเอียดธุรกรรม</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTransactionDetailDialogOpen(false)
                setSelectedTransaction(null)
              }}
            >
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog - เพิ่ม User และ Product Filters */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              ออกใบรีพอร์ต
            </DialogTitle>
            <DialogDescription>
              เลือกช่วงเวลาและเงื่อนไขการกรองเพื่อออกใบรีพอร์ต
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Location Selection (ตาม Role) */}
            {currentUser?.role === 1 && (
              <>
                <div>
                  <Label htmlFor="group_location_id">กลุ่มสถานที่</Label>
                  <Select
                    value={reportForm.group_location_id}
                    onValueChange={(value) => {
                      setReportForm({
                        ...reportForm,
                        group_location_id: value,
                        location_id: "",
                        user_ids: [] // ✅ reset users
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกกลุ่มสถานที่" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupLocations.map((group) => (
                        <SelectItem key={group.group_location_id} value={group.group_location_id.toString()}>
                          {group.group_location_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location_id">สถานที่</Label>
                  <Select
                    value={reportForm.location_id || "all"}
                    onValueChange={(value) => setReportForm({
                      ...reportForm,
                      location_id: value === "all" ? "" : value,
                      user_ids: [] // ✅ reset users
                    })}
                    disabled={!reportForm.group_location_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={reportForm.group_location_id ? "เลือกสถานที่ (หรือเว้นว่างเพื่อดูทั้งกลุ่ม)" : "เลือกกลุ่มสถานที่ก่อน"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมดในกลุ่ม</SelectItem>
                      {getFilteredLocations().map((location) => (
                        <SelectItem key={location.location_id} value={location.location_id.toString()}>
                          {location.location_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {currentUser?.role === 2 && (
              <div>
                <Label htmlFor="location_id">สถานที่ *</Label>
                <Select
                  value={reportForm.location_id}
                  onValueChange={(value) => setReportForm({
                    ...reportForm,
                    location_id: value,
                    user_ids: []
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสถานที่" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.location_id} value={location.location_id.toString()}>
                        {location.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentUser?.role === 3 && (
              <div className="bg-gray-50 rounded-md p-3">
                <Label className="text-gray-600">สถานที่</Label>
                <p className="font-semibold text-gray-900">
                  {currentUser?.locationName || `Location ID: ${currentUser?.locationId}`}
                </p>

              </div>
            )}

            {/* ✅ User Filter - Multi-select Checkbox with Search */}
            <div>
              <Label>
                ผู้ทำรายการ <span className="text-gray-400">(ไม่บังคับ)</span>
              </Label>
              <div className="border rounded-md mt-2">
                {/* Search Bar */}
                <div className="p-2 border-b bg-gray-50">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="ค้นหาชื่อผู้ใช้..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-8 h-8"
                    />
                  </div>
                </div>

                {/* Select All */}
                <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      filteredUsersForReport.length > 0 &&
                      filteredUsersForReport.every(u => reportForm.user_ids.includes(u.user_id))
                    }
                    onChange={() => {
                      const allUserIds = filteredUsersForReport.map(u => u.user_id)
                      setReportForm(prev => ({
                        ...prev,
                        user_ids: prev.user_ids.length === allUserIds.length ? [] : allUserIds
                      }))
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label className="text-sm font-semibold cursor-pointer">
                    เลือกทั้งหมด ({reportForm.user_ids.length}/{filteredUsersForReport.length})
                  </Label>
                </div>

                {/* Users List */}
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredUsersForReport.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">กรุณาเลือกสถานที่ก่อน</p>
                  ) : (
                    filteredUsersForReport
                      .filter(u =>
                        !userSearchTerm ||
                        `${u.first_name} ${u.last_name}`.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        u.user_id.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        u.Role?.role_name?.toLowerCase().includes(userSearchTerm.toLowerCase())
                      )
                      .map((user) => (
                        <div
                          key={user.user_id}
                          className="p-2 hover:bg-gray-50 flex items-center gap-2 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setReportForm(prev => ({
                              ...prev,
                              user_ids: prev.user_ids.includes(user.user_id)
                                ? prev.user_ids.filter(id => id !== user.user_id)
                                : [...prev.user_ids, user.user_id]
                            }))
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={reportForm.user_ids.includes(user.user_id)}
                            onChange={() => { }}
                            className="w-4 h-4 rounded border-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-gray-500">{user.Role?.role_name || 'N/A'}</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
              {reportForm.user_ids.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  เลือกแล้ว {reportForm.user_ids.length} คน
                </p>
              )}
            </div>

            {/* ✅ Product Filter - Multi-select Checkbox with Search */}
            <div>
              <Label>
                รายการยา <span className="text-gray-400">(ไม่บังคับ)</span>
              </Label>
              <div className="border rounded-md mt-2">
                {/* Search Bar */}
                <div className="p-2 border-b bg-gray-50">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="ค้นหายา..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="pl-8 h-8"
                    />
                  </div>
                </div>

                {/* Select All */}
                <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      products.length > 0 &&
                      products.every(p => reportForm.product_ids.includes(p.product_id))
                    }
                    onChange={() => {
                      const allProductIds = products.map(p => p.product_id)
                      setReportForm(prev => ({
                        ...prev,
                        product_ids: prev.product_ids.length === allProductIds.length ? [] : allProductIds
                      }))
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label className="text-sm font-semibold cursor-pointer">
                    เลือกทั้งหมด ({reportForm.product_ids.length}/{products.length})
                  </Label>
                </div>

                {/* Products List */}
                <div className="max-h-[200px] overflow-y-auto">
                  {products.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">ไม่พบยา</p>
                  ) : (
                    products
                      .filter(p =>
                        !productSearchTerm ||
                        p.product_name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                        p.product_id.toLowerCase().includes(productSearchTerm.toLowerCase())
                      )
                      .map((product) => (
                        <div
                          key={product.product_id}
                          className="p-2 hover:bg-gray-50 flex items-center gap-2 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setReportForm(prev => ({
                              ...prev,
                              product_ids: prev.product_ids.includes(product.product_id)
                                ? prev.product_ids.filter(id => id !== product.product_id)
                                : [...prev.product_ids, product.product_id]
                            }))
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={reportForm.product_ids.includes(product.product_id)}
                            onChange={() => { }}
                            className="w-4 h-4 rounded border-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{product.product_name}</p>
                            <p className="text-xs text-gray-500">{product.product_id}</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
              {reportForm.product_ids.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  เลือกแล้ว {reportForm.product_ids.length} รายการ
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">วันที่เริ่มต้น *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={reportForm.start_date}
                  onChange={(e) => setReportForm({ ...reportForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">วันที่สิ้นสุด *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={reportForm.end_date}
                  onChange={(e) => setReportForm({ ...reportForm, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Reporter Info */}
            <div className="bg-blue-50 rounded-md p-3">
              <Label className="text-blue-600">ผู้ออกรีพอร์ต</Label>
              <p className="font-semibold text-blue-900">
                {currentUser?.firstName} {currentUser?.lastName}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReportDialogOpen(false)}
              disabled={reportLoading}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleFetchReportData}
              disabled={reportLoading || !isReportFormValid()}
              className="bg-green-600 hover:bg-green-700"
            >
              {reportLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังโหลด...</span>
                </div>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  ดูรีพอร์ต
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ REPORT PREVIEW DIALOG - แสดงทั้ง Summary และ Detailed */}
      <Dialog open={reportPreviewOpen} onOpenChange={setReportPreviewOpen}>
        <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              รีพอร์ตสรุปการเบิก-เติมยา
            </DialogTitle>
            <DialogDescription>
              แสดงทั้งสรุปรวมและรายละเอียดการทำรายการ
            </DialogDescription>
          </DialogHeader>

          {reportData && (
            <div className="space-y-6">
              {/* ========================================
                    HEADER INFO
                ======================================== */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">สถานที่</p>
                      <p className="font-semibold text-gray-900">{reportData.location_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">กลุ่มสถานที่</p>
                      <p className="font-semibold text-gray-900">{reportData.group_location_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ช่วงเวลา</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(reportData.start_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                        {' - '}
                        {new Date(reportData.end_date).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ผู้ออกรีพอร์ต</p>
                      <p className="font-semibold text-gray-900">
                        {currentUser?.firstName} {currentUser?.lastName}
                      </p>
                    </div>
                  </div>

                  {/* ✅ แสดง Active Filters */}
                  {(reportData.filters?.user_names?.length > 0 || reportData.filters?.product_names?.length > 0) && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-sm text-gray-600 mb-2">ผู้ทำรายการ:</p>
                      <div className="flex gap-2 flex-wrap">
                        {reportData.filters?.user_names?.map((name, idx) => (
                          <Badge key={idx} className="bg-blue-600">
                            👤 {name}
                          </Badge>
                        ))}

                      </div>
                      <br />
                      <p className="text-sm text-gray-600 mb-2">ยาที่เลือก:</p>
                      <div className="flex gap-2 flex-wrap">
                        {reportData.filters?.product_names?.map((name, idx) => (
                          <Badge key={idx} className="bg-green-600">
                            💊 {name}
                          </Badge>
                        ))}
                      </div>

                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ========================================
                    SECTION 1: SUMMARY (สรุปรวมตามยา)
                ======================================== */}
              <Card>
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        📊 สรุปรวมตามยา
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        แสดงยอดรวมการเบิก-เติมของแต่ละยา ({reportData.summary_items?.length || 0} รายการ)
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {reportData.summary_items && reportData.summary_items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]">ลำดับ</TableHead>
                            <TableHead>รหัสยา</TableHead>
                            <TableHead>ชื่อยา</TableHead>
                            <TableHead className="text-right">จำนวนเติมยา</TableHead>
                            <TableHead className="text-right">จำนวนเบิกยา</TableHead>
                            <TableHead className="text-right">คงเหลือ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.summary_items.map((item: any, index: number) => (
                            <TableRow key={item.product_id}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.product_id}</Badge>
                              </TableCell>
                              <TableCell className="font-semibold">{item.product_name}</TableCell>
                              <TableCell className="text-right">
                                <Badge className="bg-green-500">
                                  {item.total_restock}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="destructive">
                                  {item.total_withdraw}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className="font-bold">
                                  {item.current_stock}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">ไม่มีข้อมูลสรุปยา</p>
                  )}
                </CardContent>
              </Card>

              {/* ========================================
                    SECTION 2: DETAILED (รายละเอียดแต่ละ Transaction)
                ======================================== */}
              <Card>
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        📋 รายละเอียดการทำรายการ
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        แสดงรายละเอียดแต่ละครั้งของการทำรายการ ({reportData.detailed_transactions?.length || 0} รายการ)
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {reportData.detailed_transactions && reportData.detailed_transactions.length > 0 ? (
                    <div className="space-y-4">
                      {reportData.detailed_transactions.map((transaction: any, index: number) => (
                        <Card
                          key={transaction.transaction_id}
                          className={`border-l-4 ${transaction.activity === 'เบิกยา'
                            ? 'border-red-500 bg-red-50/30'
                            : 'border-green-500 bg-green-50/30'
                            }`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono">
                                    #{index + 1}
                                  </Badge>
                                  <p className="font-semibold text-lg">
                                    Transaction ID: {transaction.transaction_id}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-600">
                                  👤 {transaction.user_name}
                                  <span className="text-xs text-gray-400 ml-2">({transaction.user_role})</span>
                                </p>
                                <p className="text-sm text-gray-500">
                                  📍 {transaction.location_name} • {transaction.group_location_name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  🕒 {new Date(transaction.created_at).toLocaleString('th-TH')}
                                </p>
                              </div>
                              <div className="text-right space-y-2">
                                <Badge
                                  variant={transaction.activity === 'เบิกยา' ? 'destructive' : 'default'}
                                  className={transaction.activity === 'เติมยา' ? 'bg-green-600' : ''}
                                >
                                  {transaction.activity}
                                </Badge>
                                <p className="text-sm font-semibold">
                                  รวม: <span className="text-lg">{transaction.total_amount}</span> ชิ้น
                                </p>
                                <p className="text-xs text-gray-500">
                                  {transaction.items.length} รายการ
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-white/50">
                                  <TableHead className="w-[50px]">#</TableHead>
                                  <TableHead>ยา</TableHead>
                                  <TableHead>Lot ID</TableHead>
                                  <TableHead>ตำแหน่ง</TableHead>
                                  <TableHead className="text-right">จำนวน</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {transaction.items.map((item: any, idx: number) => (
                                  <TableRow key={idx} className="bg-white">
                                    <TableCell className="text-gray-500">{idx + 1}</TableCell>
                                    <TableCell>
                                      <div>
                                        <p className="font-semibold">{item.product_name}</p>
                                        <p className="text-xs text-gray-500">{item.product_id}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{item.lot_id}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm">
                                        <p>Slot #{item.slot_id}</p>
                                        <p className="text-xs text-gray-500">
                                          Locker #{item.locker_id} • {item.locker_detail}
                                        </p>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Badge
                                        className={
                                          transaction.activity === 'เบิกยา'
                                            ? 'bg-red-600'
                                            : 'bg-green-600'
                                        }
                                      >
                                        {item.amount}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">ไม่มีรายการทำรายการในช่วงเวลานี้</p>
                  )}
                </CardContent>
              </Card>

              {/* ========================================
                    OVERALL SUMMARY
                ======================================== */}
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-700">📈 สรุปภาพรวม</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-gray-600">จำนวนรายการยา</p>
                      <p className="text-3xl font-bold text-blue-600 mt-1">
                        {reportData.summary?.total_products || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">รายการ</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-gray-600">จำนวนเติมยารวม</p>
                      <p className="text-3xl font-bold text-green-600 mt-1">
                        {reportData.summary?.total_restock_all || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">ชิ้น ({reportData.summary?.total_restock_transactions || 0} ครั้ง)</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-gray-600">จำนวนเบิกยารวม</p>
                      <p className="text-3xl font-bold text-red-600 mt-1">
                        {reportData.summary?.total_withdraw_all || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">ชิ้น ({reportData.summary?.total_withdraw_transactions || 0} ครั้ง)</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-gray-600">จำนวนคงเหลือรวม</p>
                      <p className="text-3xl font-bold text-purple-600 mt-1">
                        {reportData.summary?.total_current_stock || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">ชิ้น</p>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      ทั้งหมด <span className="font-bold">{reportData.summary?.total_transactions || 0}</span> รายการทำรายการ
                      {' '}({reportData.summary?.total_transaction_items || 0} รายการสินค้า)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setReportPreviewOpen(false)}
            >
              ปิด
            </Button>
            <Button
              onClick={handleDownloadCSV}
              disabled={!reportData}
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={!reportData}
              className="bg-red-600 hover:bg-red-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ SNAPSHOT GALLERY DIALOG */}
      <Dialog open={isSnapshotDialogOpen} onOpenChange={setIsSnapshotDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              รูปภาพการทำรายการ
            </DialogTitle>
            <DialogDescription>
              รูปภาพที่บันทึกระหว่างการทำรายการ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingSnapshots ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p className="text-gray-500 ml-3">กำลังโหลดรูปภาพ...</p>
              </div>
            ) : selectedSnapshots.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">ไม่มีรูปภาพสำหรับรายการนี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedSnapshots.map((snapshot, index) => (
                  <Card key={snapshot.snapshot_id} className="overflow-hidden hover:shadow-lg transition">
                    <CardContent className="p-0">
                      {/* รูปภาพ */}
                      <div className="relative aspect-video bg-gray-100 group">
                        <img
                          src={snapshot.image_path}
                          alt={`Snapshot ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer group-hover:opacity-90 transition"
                          onClick={() => window.open(snapshot.image_path, '_blank')}
                          loading="lazy"
                        />
                        <Badge className="absolute top-2 right-2 bg-black/70">
                          รูปที่ {index + 1}
                        </Badge>

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>

                      {/* ข้อมูล */}
                      <div className="p-4 space-y-2 bg-white">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">สินค้า:</span>
                          <span className="font-semibold">
                            {snapshot.Transaction_detail?.Product?.product_name || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Slot:</span>
                          <Badge variant="outline">
                            #{snapshot.Transaction_detail?.Slot?.slot_id || 'N/A'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">กล้อง:</span>
                          <span className="text-gray-500">
                            Camera #{snapshot.camera_id}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">เวลา:</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(snapshot.created_at).toLocaleString('th-TH')}
                          </span>
                        </div>

                        {/* ปุ่มดาวน์โหลด */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = snapshot.image_path
                            link.download = `snapshot_${snapshot.snapshot_id}.jpg`
                            link.click()
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          ดาวน์โหลด
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSnapshotDialogOpen(false)}
            >
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}