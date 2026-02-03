//app/(super-admin)/order/page.tsx
'use client'

import { useState, useEffect } from "react"
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
import { Search, Plus, Edit, Trash2, Eye, AlertTriangle, ShoppingCart, CheckCircle, XCircle, Package } from "lucide-react"

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

export default function TransactionDetailTestPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionDetails, setTransactionDetails] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [slots, setSlots] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [userLockerGrants, setUserLockerGrants] = useState<any[]>([])

  
  
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  // Current Transaction State
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null)
  const [currentActivity, setCurrentActivity] = useState<string>("")
  const [cartItems, setCartItems] = useState<CartItem[]>([])

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

  useEffect(() => {
    fetchTransactions()
    fetchTransactionDetails()
    fetchProducts()
    fetchSlots()
    fetchUserLockerGrants()
    fetchUsers()
  }, [])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/transaction/getAllTransactions`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const data = await response.json()
      setTransactions(Array.isArray(data.transactions) ? data.transactions : [])
    } catch (error) {
      console.error('Fetch transactions error:', error)
      setError('ไม่สามารถดึงข้อมูล Transaction ได้')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTransactionDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/transaction-detail/all`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const data = await response.json()
      setTransactionDetails(Array.isArray(data.details) ? data.details : [])
    } catch (error) {
      console.error('Fetch transaction details error:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/user/getAllUsers`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const data = await response.json()
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (error) {
      console.error('Fetch users error:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/product/getAllProducts`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const data = await response.json()
      setProducts(Array.isArray(data.products) ? data.products : [])
    } catch (error) {
      console.error('Fetch products error:', error)
    }
  }

  const fetchSlots = async () => {
    try {
      const response = await fetch(`${API_URL}/slot/getAllSlot`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const data = await response.json()
      setSlots(Array.isArray(data.slots) ? data.slots : [])
    } catch (error) {
      console.error('Fetch slots error:', error)
    }
  }

  const fetchUserLockerGrants = async () => {
    try {
      const response = await fetch(`${API_URL}/userLockerGrant/getAllUserLockerGrant`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const data = await response.json()
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
      // Fetch transaction details from API
      const response = await fetch(
        `${API_URL}/transactionDetail/getTransactionDetailByTransactionId/${transaction_id}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction details');
      }
      
      const data = await response.json();
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

      // ========================================
      // เช็คสิทธิ์ก่อนสร้าง Transaction
      // ========================================
      const hasPermission = checkUserPermission(
        createTransactionForm.user_id, 
        createTransactionForm.activity
      )

      if (!hasPermission) {
        setCreateTransactionLoading(false)
        return // หยุดการทำงานถ้าไม่มีสิทธิ์
      }

      const response = await fetch(`${API_URL}/transaction/createTransaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: createTransactionForm.user_id,
          activity: createTransactionForm.activity,
          status: "กำลังดำเนินการ"
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'ไม่สามารถสร้าง Transaction ได้')
      }
      
      // Set current transaction
      setCurrentTransactionId(data.transaction.transaction_id)
      setCurrentActivity(data.transaction.activity)
      setCartItems([])
      
      await fetchTransactions()
      setIsCreateTransactionDialogOpen(false)
      setCreateTransactionForm({ user_id: "", activity: "" })
      
    } catch (error: any) {
      console.error('Error creating transaction:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
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

      const response = await fetch(`${API_URL}/transactionDetail/addItemToCart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: currentTransactionId,
          product_id: addItemForm.product_id,
          lot_id: addItemForm.lot_id,
          slot_id: addItemForm.slot_id,
          amount: parseInt(addItemForm.amount),
          expired_at: addItemForm.expired_at || null
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'ไม่สามารถเพิ่มรายการได้')
      }
      
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
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
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

      const response = await fetch(`${API_URL}/transactionDetail/removeItemFromTempCart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: currentTransactionId,
          slot_stock_id: item.slot_stock_id,
          amount_to_remove: item.amount_added || item.amount,
          was_created: item.was_created
        })
      })

      // ตรวจสอบว่า response เป็น JSON หรือไม่
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Response is not JSON:', text.substring(0, 200))
        throw new Error(`API ไม่ตอบกลับเป็น JSON (Status: ${response.status})`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'ไม่สามารถลบรายการได้')
      }

      // ลบออกจาก cartItems
      const newCartItems = cartItems.filter((_, i) => i !== index)
      setCartItems(newCartItems)

      alert('ลบรายการออกจากตะกร้าสำเร็จ')

    } catch (error: any) {
      console.error('Error removing item:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
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

      const response = await fetch(`${API_URL}/transactionDetail/confirmTransaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: currentTransactionId,
          items: items
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'ไม่สามารถยืนยันรายการได้')
      }
      
      // Reset state
      setCurrentTransactionId(null)
      setCurrentActivity("")
      setCartItems([])
      
      await fetchTransactions()
      await fetchTransactionDetails()
      
      setIsConfirmDialogOpen(false)
      
      
    } catch (error: any) {
      console.error('Error confirming transaction:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
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

      const response = await fetch(`${API_URL}/transactionDetail/cancelTransaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: currentTransactionId,
          rollback_items: rollbackItems
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'ไม่สามารถยกเลิกได้')
      }

      // Reset state
      setCurrentTransactionId(null)
      setCurrentActivity("")
      setCartItems([])

      await fetchTransactions()

      setIsCancelDialogOpen(false)
      alert('ยกเลิกรายการสำเร็จ')

    } catch (error: any) {
      console.error('Error canceling transaction:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setCancelLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(
    (transaction) =>
      transaction.transaction_id?.toString().includes(searchTerm) ||
      transaction.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.activity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      
      (users.find(u => u.user_id === transaction.user_id)?.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    if (status === 'สำเร็จ') {
      return <Badge className="bg-green-500">สำเร็จ</Badge>
    } else if (status === 'กำลังดำเนินการ') {
      return <Badge className="bg-yellow-500">กำลังดำเนินการ</Badge>
    } else {
      return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Transaction Detail Testing</h1>
          <p className="text-gray-500">ทดสอบระบบจัดการรายการธุรกรรม</p>
        </div>
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
          <TabsTrigger value="details">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Transaction Details
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
                <Button
                  onClick={() => setIsCreateTransactionDialogOpen(true)}
                  disabled={!!currentTransactionId}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  สร้าง Transaction ใหม่
                </Button>
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
                      <TableHead>วันที่สร้าง</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500">
                          ไม่พบข้อมูล Transaction
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.transaction_id}>
                          <TableCell className="font-medium">
                            {transaction.transaction_id}
                          </TableCell>
                          <TableCell>{transaction.User.first_name|| "-"} {transaction.User.last_name|| "-"}</TableCell>
                          <TableCell>{transaction.activity}</TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
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
                                {/* ปุ่มอื่นๆ */}
                              </div>
                            </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSACTION DETAILS TAB */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>รายละเอียด Transaction Details</CardTitle>
              <CardDescription>
                ดูรายละเอียดของ Transaction ที่ยืนยันแล้ว
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Detail ID</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Slot Stock ID</TableHead>
                    <TableHead>Slot ID</TableHead>
                    <TableHead>จำนวน</TableHead>
                    <TableHead>วันที่สร้าง</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500">
                        ยังไม่มี Transaction Detail
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactionDetails.map((detail) => (
                      <TableRow key={detail.transaction_detail_id}>
                        <TableCell className="font-medium">
                          {detail.transaction_detail_id}
                        </TableCell>
                        <TableCell>{detail.transaction_id}</TableCell>
                        <TableCell>{detail.product_id}</TableCell>
                        <TableCell>{detail.slot_stock_id}</TableCell>
                        <TableCell>{detail.slot_id}</TableCell>
                        <TableCell>{detail.amount}</TableCell>
                        <TableCell>
                          {new Date(detail.created_at).toLocaleString('th-TH')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
                  setCreateTransactionForm({...createTransactionForm, user_id: e.target.value})
                  setPermissionError(null) // ล้าง error เมื่อเปลี่ยน user
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
                  setCreateTransactionForm({...createTransactionForm, activity: value})
                  setPermissionError(null) // ล้าง error เมื่อเปลี่ยน activity
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
                onValueChange={(value) => setAddItemForm({...addItemForm, product_id: value})}
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
                onChange={(e) => setAddItemForm({...addItemForm, lot_id: e.target.value})}
                placeholder="เช่น LOT2025001"
              />
            </div>
            <div>
              <Label htmlFor="slot_id">Slot ID *</Label>
              <Select
                value={addItemForm.slot_id}
                onValueChange={(value) => setAddItemForm({...addItemForm, slot_id: value})}
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
                onChange={(e) => setAddItemForm({...addItemForm, amount: e.target.value})}
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
                  onChange={(e) => setAddItemForm({...addItemForm, expired_at: e.target.value})}
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
                {/* loop cartItems ออกมาแสดง */}
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
        <DialogContent className="max-w-full max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>รายละเอียดธุรกรรม</DialogTitle>
            <DialogDescription>
              ดูรายละเอียดและรายการสินค้าในธุรกรรม
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && selectedTransaction.length > 0 && (
            <div className="space-y-6">
              {/* Transaction Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ข้อมูลธุรกรรม</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
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
                    <Badge variant={
                      selectedTransaction[0].Transaction.status === 'สำเร็จ' ? 'default' : 
                      selectedTransaction[0].Transaction.status === 'กำลังดำเนินการ' ? 'secondary' : 
                      'destructive'
                    }>
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
                          <TableHead className="text-right">จำนวน</TableHead>
                          <TableHead className="text-right">คงเหลือในช่อง</TableHead>
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
                            <TableCell className="text-right">
                              <Badge 
                                variant={selectedTransaction[0].Transaction.activity === 'เบิกยา' ? 'destructive' : 'default'}
                                className="font-semibold"
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
                <CardContent className="pt-6">
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
      
    </div>
  )
}


