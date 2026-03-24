'use client'

import { useState, useEffect, useRef, useMemo } from "react"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { thSarabunBase64 } from "@/lib/thsarabun-font"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Search, Plus, Trash2, QrCode, Printer, Download,
  AlertTriangle, Package, RefreshCw, Info,
  Copy,
} from "lucide-react"

// ─── QR Generation ────────────────────────────────────────────────────────────
const generateQRDataUrl = async (text: string, size = 300): Promise<string> => {
  try {
    const QRCode = (await import("qrcode")).default
    return await QRCode.toDataURL(text, {
      width: size, margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    })
  } catch {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=ffffff&color=1a1a2e&margin=2`
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskItem {
  product_id: string
  product_name: string | null
  slot_id: number
  slot_stock_id: number | null  // null = restock (new), not null = dispense (existing)
  amount: number
  lot_id: string | null
  expired_at: string | null
}

interface QrTask {
  task_id: string
  locker_id: number
  task_type: "restock" | "dispense"
  assigned_user_id: string
  qr_token: string
  items_json: TaskItem[]
  status: "pending" | "completed" | "cancelled"
  expires_at: string | null
  used_at: string | null
  created_at: string
  updated_at: string | null
  deleted_at: string | null
  locker_location_detail?: string
}

interface Locker {
  locker_id: number
  location_id: number
  locker_location_detail: string | null
  locker_status: boolean
  Locker_Provision?: { is_activated: boolean } | null
}

interface Product {
  product_id: string
  product_name: string | null
}

interface Slot {
  slot_id: number
  locker_id: number
  capacity: number | null
}

interface SlotStock {
  slot_stock_id: number
  slot_id: number
  product_id: string
  lot_id: string
  amount: number | null
  expired_at: string | null
}

interface UserLockerGrant {
  user_locker_grant_id: number
  user_id: string
  locker_id: number
  location_id: number
  permission_withdraw: number  // 1 = dispense allowed
  permission_restock: number   // 1 = restock allowed
  granted_by: string | null
  User: { first_name: string | null; last_name: string | null }
  Locker: { locker_id: number; locker_location_detail: string | null }
  Location: { location_name: string | null }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case "pending": return <Badge className="bg-yellow-500 text-white">รอดำเนินการ</Badge>
    case "completed": return <Badge className="bg-green-600 text-white">สำเร็จ</Badge>
    case "cancelled": return <Badge variant="destructive">ยกเลิก</Badge>
    default: return <Badge variant="secondary">{status}</Badge>
  }
}

function getTaskTypeBadge(type: string) {
  return type === "restock"
    ? <Badge className="bg-blue-600 text-white">เติมยา</Badge>
    : <Badge className="bg-orange-500 text-white">เบิกยา</Badge>
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QrTaskPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  // Auth
  const [currentUser, setCurrentUser] = useState<{
    id: string; email: string; role: number
    locationId: number | null; locationName: string
    groupLocationId: number | null; groupLocationName: string
    firstName: string; lastName: string
  } | null>(null)

  // Data
  const [tasks, setTasks] = useState<QrTask[]>([])
  const [lockers, setLockers] = useState<Locker[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotStocks, setSlotStocks] = useState<SlotStock[]>([])
  const [grants, setGrants] = useState<UserLockerGrant[]>([])  // ← replaces users

  // UI
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isQrViewOpen, setIsQrViewOpen] = useState(false)
  const [isPoOpen, setIsPoOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<QrTask | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")

  // Create form
  const [form, setForm] = useState({
    locker_id: "",
    task_type: "" as "restock" | "dispense" | "",
    assigned_user_id: "",
    expires_at: "",
  })
  const [items, setItems] = useState<TaskItem[]>([])
  const [newItem, setNewItem] = useState({
    product_id: "",
    slot_id: "",
    slot_stock_id: "",  // dispense only — selected slotStock
    lot_id: "",         // restock: typed | dispense: from slotStock
    amount: "",
    expired_at: "",     // restock: typed | dispense: auto from slotStock
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const poRef = useRef<HTMLDivElement>(null)

  // ── Load user ────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user") || sessionStorage.getItem("user")
    if (!stored) return
    try {
      const u = JSON.parse(stored)
      setCurrentUser({
        id: u.id,
        email: u.email || "",
        role: Number(u.role),
        locationId: u.locationId ?? null,
        locationName: u.locationName || "",
        groupLocationId: u.groupLocationId ?? null,
        groupLocationName: u.groupLocationName || "",
        firstName: u.firstName || "",
        lastName: u.lastName || "",
      })
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!currentUser) return
    fetchAll()
  }, [currentUser])

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchAll = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchTasks(),
        fetchLockers(),
        fetchProducts(),
        fetchSlots(),
        fetchSlotStocks(),
        fetchGrants(),
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // ── Fetch tasks: loop activated lockers via /qrTask/getByLocker/:id ──────
  const fetchTasks = async () => {
    try {
      let resLockers = await fetch(`${API_URL}/locker/getLockersActivate`, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() }
      })
      if (!resLockers.ok) {
        resLockers = await fetch(`${API_URL}/locker/getAllLockers`, {
          headers: { "Content-Type": "application/json", ...getAuthHeader() }
        })
      }
      if (!resLockers.ok) return

      const dataLockers = await resLockers.json()
      const allLockers: Locker[] = Array.isArray(dataLockers.lockers) ? dataLockers.lockers : []

      const activatedLockers = allLockers
        .filter(l => l.Locker_Provision?.is_activated !== false)
        .filter(l => currentUser?.role === 1 || l.location_id === currentUser?.locationId)

      const allTasks: QrTask[] = []
      await Promise.all(activatedLockers.map(async (locker) => {
        try {
          const r = await fetch(`${API_URL}/qrTask/getByLocker/${locker.locker_id}`, {
            headers: { "Content-Type": "application/json", ...getAuthHeader() }
          })
          if (!r.ok) return
          const d = await r.json()
          const arr: QrTask[] = Array.isArray(d.tasks) ? d.tasks : []
          arr.forEach(t => { t.locker_location_detail = locker.locker_location_detail || "" })
          allTasks.push(...arr)
        } catch { /* skip */ }
      }))

      setTasks(allTasks.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
    } catch (err) { console.error("fetchTasks error:", err) }
  }

  // ── Fetch activated lockers ───────────────────────────────────────────────
  const fetchLockers = async () => {
    try {
      let res = await fetch(`${API_URL}/locker/getLockersActivate`, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() }
      })
      if (!res.ok) {
        res = await fetch(`${API_URL}/locker/getAllLockers`, {
          headers: { "Content-Type": "application/json", ...getAuthHeader() }
        })
      }
      if (!res.ok) return
      const data = await res.json()
      let all: Locker[] = Array.isArray(data.lockers) ? data.lockers : []
      all = all.filter(l => l.Locker_Provision?.is_activated !== false)
      if (currentUser?.role !== 1) {
        all = all.filter(l => l.location_id === currentUser?.locationId)
      }
      setLockers(all)
    } catch { /* ignore */ }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/product/getAllProducts`, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() }
      })
      if (!res.ok) return
      const data = await res.json()
      setProducts(Array.isArray(data.products) ? data.products : [])
    } catch { /* ignore */ }
  }

  const fetchSlots = async () => {
    try {
      const res = await fetch(`${API_URL}/slot/getAllSlot`, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() }
      })
      if (!res.ok) return
      const data = await res.json()
      setSlots(Array.isArray(data.slots) ? data.slots : [])
    } catch { /* ignore */ }
  }

  const fetchSlotStocks = async () => {
    try {
      const res = await fetch(`${API_URL}/slotStock/getAllSlotStocks`, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() }
      })
      if (!res.ok) return
      const data = await res.json()
      setSlotStocks(Array.isArray(data.slotStocks) ? data.slotStocks : [])
    } catch { /* ignore */ }
  }

  // ── Fetch grants (replaces fetchUsers) ────────────────────────────────────
  const fetchGrants = async () => {
    try {
      const res = await fetch(`${API_URL}/userLockerGrant/getAllUserLockerGrant`, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() }
      })
      if (!res.ok) return
      const data = await res.json()
      setGrants(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  // Slots belonging to selected locker
  const slotsForLocker = useMemo(() =>
    form.locker_id
      ? slots.filter(s => s.locker_id === parseInt(form.locker_id))
      : []
    , [form.locker_id, slots])

  // Task types available based on grants for selected locker
  const availableTaskTypes = useMemo(() => {
    if (!form.locker_id) return []
    const lockerId = parseInt(form.locker_id)
    const lockerGrants = grants.filter(g => g.locker_id === lockerId)
    const types: Array<"restock" | "dispense"> = []
    if (lockerGrants.some(g => g.permission_restock === 1)) types.push("restock")
    if (lockerGrants.some(g => g.permission_withdraw === 1)) types.push("dispense")
    return types
  }, [form.locker_id, grants])

  // Assignable users: grants for selected locker + task_type permission
  const assignableUsers = useMemo(() => {
    if (!form.locker_id || !form.task_type) return []
    const lockerId = parseInt(form.locker_id)
    return grants.filter(g => {
      if (g.locker_id !== lockerId) return false
      if (form.task_type === "dispense") return g.permission_withdraw === 1
      if (form.task_type === "restock") return g.permission_restock === 1
      return false
    })
  }, [form.locker_id, form.task_type, grants])

  // Current stock per slot (from DB)
  const getSlotCurrentAmount = (slotId: number) =>
    slotStocks
      .filter(s => s.slot_id === slotId)
      .reduce((sum, s) => sum + (s.amount || 0), 0)

  // Slot capacity
  const getSlotCapacity = (slotId: number) =>
    slots.find(s => s.slot_id === slotId)?.capacity || 0

  // For restock: remaining = capacity - currentStock - amounts already in cart for same slot
  const getSlotRestockRemaining = (slotId: number) => {
    const cap = getSlotCapacity(slotId)
    const current = getSlotCurrentAmount(slotId)
    const inCart = items
      .filter(i => i.slot_id === slotId)
      .reduce((sum, i) => sum + i.amount, 0)
    return cap - current - inCart
  }

  // For dispense: available per slotStock = DB amount - already in cart for same slot_stock_id
  const getSlotStockAvailable = (slotStockId: number) => {
    const ss = slotStocks.find(s => s.slot_stock_id === slotStockId)
    const dbAmt = ss?.amount || 0
    const inCart = items
      .filter(i => i.slot_stock_id === slotStockId)
      .reduce((sum, i) => sum + i.amount, 0)
    return dbAmt - inCart
  }

  // For dispense: slots in selected locker that have the selected product
  const slotsWithSelectedProduct = useMemo(() => {
    if (form.task_type !== "dispense" || !newItem.product_id) return []
    const slotIdsInLocker = new Set(slotsForLocker.map(s => s.slot_id))
    return slotStocks
      .filter(ss => ss.product_id === newItem.product_id && slotIdsInLocker.has(ss.slot_id) && (ss.amount || 0) > 0)
      .map(ss => ss.slot_id)
      .filter((v, i, a) => a.indexOf(v) === i) // unique
  }, [form.task_type, newItem.product_id, slotStocks, slotsForLocker])

  // For dispense: lots (slotStocks) in selected slot for selected product
  const lotsForDispense = useMemo(() => {
    if (form.task_type !== "dispense" || !newItem.product_id || !newItem.slot_id) return []
    return slotStocks.filter(ss =>
      ss.product_id === newItem.product_id &&
      ss.slot_id === parseInt(newItem.slot_id) &&
      getSlotStockAvailable(ss.slot_stock_id) > 0
    )
  }, [form.task_type, newItem.product_id, newItem.slot_id, slotStocks, items])

  // ── Add item ──────────────────────────────────────────────────────────────
  const handleAddItem = () => {
    setFormError(null)

    if (!newItem.product_id || !newItem.slot_id || !newItem.amount) {
      setFormError("กรุณากรอกข้อมูลให้ครบถ้วน")
      return
    }

    const slotId = parseInt(newItem.slot_id)
    const amount = parseInt(newItem.amount)

    if (isNaN(amount) || amount <= 0) {
      setFormError("จำนวนต้องมากกว่า 0")
      return
    }

    if (form.task_type === "restock") {
      if (!newItem.lot_id) {
        setFormError("กรุณาระบุ Lot ID")
        return
      }
      const remaining = getSlotRestockRemaining(slotId)
      if (amount > remaining) {
        setFormError(`จำนวนเกิน capacity ที่เหลือใน Slot #${slotId} (เหลือ ${remaining} ช่อง)`)
        return
      }
      const product = products.find(p => p.product_id === newItem.product_id)
      setItems([...items, {
        product_id: newItem.product_id,
        product_name: product?.product_name || null,
        slot_id: slotId,
        slot_stock_id: null,  // restock = new stock
        amount,
        lot_id: newItem.lot_id,
        expired_at: newItem.expired_at || null,
      }])

    } else if (form.task_type === "dispense") {
      if (!newItem.slot_stock_id) {
        setFormError("กรุณาเลือก Lot ที่ต้องการเบิก")
        return
      }
      const slotStockId = parseInt(newItem.slot_stock_id)
      const available = getSlotStockAvailable(slotStockId)
      if (amount > available) {
        setFormError(`จำนวนเกินที่มีอยู่ใน Lot นี้ (มี ${available} ชิ้น)`)
        return
      }
      const product = products.find(p => p.product_id === newItem.product_id)
      setItems([...items, {
        product_id: newItem.product_id,
        product_name: product?.product_name || null,
        slot_id: slotId,
        slot_stock_id: slotStockId,
        amount,
        lot_id: newItem.lot_id,
        expired_at: newItem.expired_at || null,
      }])
    }

    // Reset item form (keep product_id for convenience)
    setNewItem(prev => ({
      ...prev,
      slot_id: "", slot_stock_id: "", lot_id: "",
      amount: "", expired_at: "",
    }))
  }

  // ── Create task ───────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setFormError(null)
    if (!form.locker_id || !form.task_type || !form.assigned_user_id || items.length === 0) {
      setFormError("กรุณากรอกข้อมูลให้ครบถ้วนและเพิ่มรายการอย่างน้อย 1 รายการ")
      return
    }
    setCreateLoading(true)
    try {
      const res = await fetch(`${API_URL}/qrTask/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          locker_id: parseInt(form.locker_id),
          task_type: form.task_type,
          assigned_user_id: form.assigned_user_id,
          expires_at: form.expires_at || undefined,
          items,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "ไม่สามารถสร้าง QR Task ได้")

      const newTask: QrTask = {
        ...data.task,
        items_json: items,
        locker_location_detail: lockers.find(l => l.locker_id === parseInt(form.locker_id))?.locker_location_detail || "",
      }
      setIsCreateOpen(false)
      resetForm()
      await fetchAll()
      await openQrView({ ...newTask, qr_token: data.task.qr_token })
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setCreateLoading(false)
    }
  }

  // ── Cancel task ───────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!selectedTask) return
    try {
      const res = await fetch(`${API_URL}/qrTask/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ task_id: selectedTask.task_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setIsDeleteOpen(false)
      setSelectedTask(null)
      await fetchAll()
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`)
    }
  }

  // ── QR View ───────────────────────────────────────────────────────────────
  const openQrView = async (task: QrTask) => {
    setSelectedTask(task)
    setQrDataUrl(await generateQRDataUrl(task.qr_token, 300))
    setIsQrViewOpen(true)
  }

  const handleDownloadQr = () => {
    if (!qrDataUrl || !selectedTask) return
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = `qr-${selectedTask.qr_token}.png`
    a.click()
  }

  // ── PO ────────────────────────────────────────────────────────────────────
  const openPo = async (task: QrTask) => {
    setSelectedTask(task)
    setQrDataUrl(await generateQRDataUrl(task.qr_token, 280))
    setIsPoOpen(true)
  }

  const handlePrint = () => {
    if (!poRef.current) return
    const content = poRef.current.innerHTML
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <title>ใบสั่งเบิก/เติมยา</title>
      <head>
        <meta charset="utf-8"/>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;700&display=swap');
          
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { width: 100%; height: 100%; }
          
          body {
            font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 20px;
            color: #1a1a2e;
            font-size: 13px;
            line-height: 1.4;
            background: #fff;
          }
          
          /* Header styles */
          .border-b { border-bottom: 2px solid #d1d5db; padding-bottom: 12px; }
          .text-center { text-align: center; }
          .pb-4 { padding-bottom: 16px; }
          .px-4 { padding-left: 16px; padding-right: 16px; }
          .pt-4 { padding-top: 16px; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          
          h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #111827; }
          h2 { font-size: 14px; font-weight: 700; margin-top: 16px; margin-bottom: 8px; color: #111827; }
          
          /* Grid and spacing */
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
          .gap-4 { gap: 16px; }
          .gap-8 { gap: 32px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-6 { margin-bottom: 24px; }
          .mt-1 { margin-top: 4px; }
          .mt-3 { margin-top: 12px; }
          .mt-6 { margin-top: 24px; }
          
          /* Info boxes */
          .p-3 { padding: 12px; }
          .p-6 { padding: 24px; }
          .border { border: 1px solid #d1d5db; }
          .rounded { border-radius: 8px; }
          .rounded-lg { border-radius: 8px; }
          .rounded-xl { border-radius: 12px; }
          .bg-gray-50 { background-color: #f9fafb; }
          .bg-blue-50 { background-color: #eff6ff; }
          
          .border-rounded { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
          
          label { font-size: 10px; color: #888; display: block; margin-bottom: 4px; font-weight: 600; text-transform: uppercase; }
          
          /* Text styles */
          .text-xs { font-size: 10px; }
          .text-sm { font-size: 12px; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-semibold { font-weight: 600; }
          .font-medium { font-weight: 500; }
          .font-bold { font-weight: 700; }
          .font-mono { font-family: 'Courier New', monospace; }
          .text-gray-400 { color: #9ca3af; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-900 { color: #111827; }
          
          /* Table styles */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            font-size: 11px;
          }
          
          thead {
            background-color: #f3f4f6;
            border-bottom: 2px solid #d1d5db;
          }
          
          th {
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 11px;
            color: #374151;
            border: 1px solid #e5e7eb;
          }
          
          td {
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
            border: 1px solid #e5e7eb;
          }
          
          tbody tr:nth-child(even) {
            background-color: #f9fafb;
          }
          
          tbody tr:hover {
            background-color: #f3f4f6;
          }
          
          /* Flex */
          .flex { display: flex; }
          .items-center { align-items: center; }
          .gap-2 { gap: 8px; }
          
          /* QR section */
          .qr-container {
            display: flex;
            gap: 24px;
            background-color: #f9fafb;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }
          
          .qr-image {
            width: 100px;
            height: 100px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
          }
          
          .qr-info { flex: 1; }
          .qr-info p { margin-bottom: 6px; font-size: 11px; }
          .qr-token { font-family: 'Courier New', monospace; font-weight: 700; font-size: 10px; word-break: break-all; }
          
          /* Footer */
          .footer-text {
            text-align: center;
            font-size: 10px;
            color: #999;
            margin-top: 30px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }
          
          /* Break handling */
          .page-break { page-break-after: always; }
          
          @media print {
            body { padding: 15px; margin: 0; }
            table { page-break-inside: avoid; }
            tr { page-break-inside: avoid; }
            .qr-container { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `)
    win.document.close()
    setTimeout(() => { win.print() }, 500)
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ locker_id: "", task_type: "", assigned_user_id: "", expires_at: "" })
    setItems([])
    setNewItem({ product_id: "", slot_id: "", slot_stock_id: "", lot_id: "", amount: "", expired_at: "" })
    setFormError(null)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter(t =>
    t.task_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.qr_token.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.locker_location_detail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.task_type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Look up user name from grants (for task table display)
  const getUserName = (userId: string) => {
    const grant = grants.find(g => g.user_id === userId)
    if (grant?.User) return `${grant.User.first_name || ""} ${grant.User.last_name || ""}`.trim()
    return userId.slice(0, 8) + "..."
  }

  const getLockerDetail = (lockerId: number) =>
    lockers.find(l => l.locker_id === lockerId)?.locker_location_detail || `Locker #${lockerId}`

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">ออกใบทำรายการ และ QRCode</h1>
          <p className="text-gray-500">จัดการคำสั่งการเติม/เบิกยาผ่าน QR Code</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { resetForm(); setIsCreateOpen(true) }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            สร้างใบทำรายการ
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>รายการ QR Tasks</CardTitle>
              <CardDescription>
                {currentUser?.role === 1
                  ? "แสดงทุก Location (System Admin)"
                  : `${currentUser?.locationName} · ${currentUser?.groupLocationName}`}
              </CardDescription>
            </div>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="ค้นหา Task ID, QR Token, ตำแหน่งตู้..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto" />
              <p className="text-gray-500 mt-3">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Locker</TableHead>
                  <TableHead>ตำแหน่งตู้</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>ผู้รับมอบหมาย</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันหมดอายุ</TableHead>
                  <TableHead>วันที่สร้าง</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-400 py-12">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      ไม่พบ QR Task
                    </TableCell>
                  </TableRow>
                ) : filteredTasks.map(task => (
                  <TableRow key={task.task_id}>
                    <TableCell className="font-medium">#{task.locker_id}</TableCell>
                    <TableCell className="max-w-[140px] truncate">
                      {task.locker_location_detail || getLockerDetail(task.locker_id)}
                    </TableCell>
                    <TableCell>{getTaskTypeBadge(task.task_type)}</TableCell>
                    <TableCell>{getUserName(task.assigned_user_id)}</TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {task.expires_at ? new Date(task.expires_at).toLocaleString("th-TH") : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(task.created_at).toLocaleString("th-TH")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openQrView(task)} title="ดู QR Code">
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openPo(task)} title="ออกใบ PO">
                          <Printer className="w-4 h-4" />
                        </Button>
                        {task.status === "pending" && (
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => { setSelectedTask(task); setIsDeleteOpen(true) }}
                            title="ยกเลิก"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
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

      {/* ══════════════════════════════════════════════════════════
          CREATE DIALOG
      ══════════════════════════════════════════════════════════ */}
      <Dialog open={isCreateOpen} onOpenChange={open => { if (!open) resetForm(); setIsCreateOpen(open) }}>
        <DialogContent className="max-w-3xl max-h-[calc(100vh-60px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>สร้าง QR Task ใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลเพื่อสร้างคำสั่งการเติม/เบิกยา</DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {formError}
            </div>
          )}

          {/* Step 1–4: Header fields */}
          <div className="grid grid-cols-2 gap-4">

            {/* 1. ตู้ยา */}
            <div>
              <Label>1. ตู้ยา (Locker) *</Label>
              <Select
                value={form.locker_id}
                onValueChange={v => {
                  setForm({ locker_id: v, task_type: "", assigned_user_id: "", expires_at: form.expires_at })
                  setItems([])
                  setNewItem({ product_id: "", slot_id: "", slot_stock_id: "", lot_id: "", amount: "", expired_at: "" })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกตู้ที่ activated แล้ว" />
                </SelectTrigger>
                <SelectContent>
                  {lockers.length === 0
                    ? <div className="px-2 py-4 text-sm text-gray-400 text-center">ไม่พบตู้ที่ activated</div>
                    : lockers.map(l => (
                      <SelectItem key={l.locker_id} value={l.locker_id.toString()}>
                        Locker #{l.locker_id} — {l.locker_location_detail || "ไม่ระบุ"}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* 2. ประเภทงาน */}
            <div>
              <Label>2. ประเภทงาน *</Label>
              <Select
                value={form.task_type}
                disabled={!form.locker_id}
                onValueChange={v => {
                  setForm(f => ({ ...f, task_type: v as any, assigned_user_id: "" }))
                  setItems([])
                  setNewItem({ product_id: "", slot_id: "", slot_stock_id: "", lot_id: "", amount: "", expired_at: "" })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!form.locker_id ? "เลือกตู้ก่อน" : "เลือกประเภท"} />
                </SelectTrigger>
                <SelectContent>
                  {availableTaskTypes.length === 0
                    ? <div className="px-2 py-4 text-sm text-gray-400 text-center">ไม่มีผู้ได้รับสิทธิ์สำหรับตู้นี้</div>
                    : availableTaskTypes.map(t => (
                      <SelectItem key={t} value={t}>
                        {t === "restock" ? "เติมยา (Restock)" : "เบิกยา (Dispense)"}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              {form.locker_id && availableTaskTypes.length === 0 && (
                <p className="text-xs text-amber-600 mt-1 flex gap-1 items-center">
                  <Info className="w-3 h-3" />
                  ยังไม่มีผู้ใช้ได้รับสิทธิ์สำหรับตู้นี้ กรุณาให้สิทธิ์ก่อนในหน้า User Management
                </p>
              )}
            </div>

            {/* 3. ผู้รับมอบหมาย */}
            <div>
              <Label>3. ผู้รับมอบหมาย *</Label>
              <Select
                value={form.assigned_user_id}
                disabled={!form.task_type}
                onValueChange={v => setForm(f => ({ ...f, assigned_user_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!form.task_type ? "เลือกประเภทงานก่อน" : "เลือกผู้รับมอบหมาย"} />
                </SelectTrigger>
                <SelectContent>
                  {assignableUsers.length === 0
                    ? <div className="px-2 py-4 text-sm text-gray-400 text-center">
                      ไม่มีผู้มีสิทธิ์{form.task_type === "dispense" ? "เบิกยา" : "เติมยา"}สำหรับตู้นี้
                    </div>
                    : assignableUsers.map(g => (
                      <SelectItem key={g.user_locker_grant_id} value={g.user_id}>
                        {g.User.first_name} {g.User.last_name}
                        <span className="text-xs text-gray-400 ml-2">
                          ({form.task_type === "dispense" ? "สิทธิ์เบิก" : "สิทธิ์เติม"})
                        </span>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* 4. วันหมดอายุ QR */}
            <div>
              <Label>4. วันหมดอายุ QR (ไม่บังคับ)</Label>
              <Input
                type="datetime-local"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
          </div>

          {/* Step 5: Items */}
          <div className="border rounded-lg p-4 mt-2">
            <h3 className="font-semibold mb-1">5. รายการยา (Items)</h3>
            {form.task_type && (
              <p className="text-xs text-gray-400 mb-3">
                {form.task_type === "restock"
                  ? "เติมยา: เลือกสินค้า → เลือก Slot → ระบุ Lot ID และจำนวน"
                  : "เบิกยา: เลือกสินค้าก่อน → ระบบแสดงเฉพาะ Slot ที่มียานั้น → เลือก Lot และจำนวน"}
              </p>
            )}

            {/* Add item form */}
            {form.locker_id && form.task_type && (
              <div className="bg-gray-50 p-3 rounded mb-3 space-y-2">

                {/* Row 1 */}
                <div className="grid grid-cols-12 gap-2 overflow-x-auto">
                  {/* Product */}
                  <div className="col-span-4">
                    <Label className="text-xs">สินค้า *</Label>
                    <Select
                      value={newItem.product_id}
                      onValueChange={v => setNewItem({
                        product_id: v, slot_id: "", slot_stock_id: "",
                        lot_id: "", amount: "", expired_at: ""
                      })}
                    >
                      <SelectTrigger className="h-8 text-xs w-full min-w-0 overflow-hidden">
                        <span className="block truncate text-xs">
                          {newItem.product_id
                            ? products.find(p => p.product_id === newItem.product_id)?.product_name
                            : <span className="text-gray-400">เลือกสินค้า</span>}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.product_id} value={p.product_id} className="text-xs">
                            {p.product_name} ({p.product_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Slot */}
                  <div className="col-span-4">
                    <Label className="text-xs">
                      Slot *
                      {form.task_type === "dispense" && newItem.product_id && slotsWithSelectedProduct.length === 0 && (
                        <span className="text-amber-600 ml-1">(ไม่มียานี้ในตู้)</span>
                      )}
                    </Label>
                    <Select
                      value={newItem.slot_id}
                      disabled={!newItem.product_id || (form.task_type === "dispense" && slotsWithSelectedProduct.length === 0)}
                      onValueChange={v => setNewItem(prev => ({
                        ...prev, slot_id: v, slot_stock_id: "", lot_id: "", amount: "", expired_at: ""
                      }))}
                    >
                      <SelectTrigger className="h-8 text-xs w-full min-w-0 overflow-hidden">
                        <span className="block truncate text-xs">
                          {newItem.slot_id
                            ? (() => {
                              const s = slots.find(sl => sl.slot_id === parseInt(newItem.slot_id))
                              const remaining = getSlotRestockRemaining(parseInt(newItem.slot_id))
                              return form.task_type === "restock"
                                ? `Slot #${newItem.slot_id} — เหลือ ${remaining}/${s?.capacity || 0}`
                                : `Slot #${newItem.slot_id}`
                            })()
                            : <span className="text-gray-400">เลือก Slot</span>}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {form.task_type === "restock"
                          ? slotsForLocker.map(s => {
                            const remaining = getSlotRestockRemaining(s.slot_id)
                            return (
                              <SelectItem
                                key={s.slot_id} value={s.slot_id.toString()}
                                disabled={remaining <= 0}
                                className="text-xs"
                              >
                                Slot #{s.slot_id} — เหลือ {remaining}/{s.capacity || 0}
                                {remaining <= 0 && " (เต็ม)"}
                              </SelectItem>
                            )
                          })
                          : slotsWithSelectedProduct.map(slotId => {
                            const current = slotStocks
                              .filter(ss => ss.slot_id === slotId && ss.product_id === newItem.product_id)
                              .reduce((sum, ss) => sum + getSlotStockAvailable(ss.slot_stock_id), 0)
                            return (
                              <SelectItem key={slotId} value={slotId.toString()} className="text-xs">
                                Slot #{slotId} — มี {current} ชิ้น
                              </SelectItem>
                            )
                          })
                        }
                      </SelectContent>
                    </Select>
                    {form.task_type === "restock" && newItem.slot_id && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        เหลือ: {getSlotRestockRemaining(parseInt(newItem.slot_id))} ช่อง
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="col-span-3">
                    <Label className="text-xs">จำนวน *</Label>
                    <Input
                      type="number" min="1" className="h-8 text-xs"
                      value={newItem.amount}
                      onChange={e => setNewItem(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0"
                    />
                  </div>

                  {/* Add button */}
                  <div className="col-span-1 flex items-end">
                    <Button
                      size="sm" onClick={handleAddItem}
                      className="h-8 w-full bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Row 2 — Lot & expiry */}
                <div className="grid grid-cols-12 gap-2">
                  {/* Lot ID */}
                  <div className="col-span-5">
                    <Label className="text-xs">
                      Lot ID *
                      {form.task_type === "dispense" && " (เลือก Lot ที่จะเบิก)"}
                    </Label>
                    {form.task_type === "restock" ? (
                      <Input
                        className="h-8 text-xs"
                        value={newItem.lot_id}
                        onChange={e => setNewItem(prev => ({ ...prev, lot_id: e.target.value }))}
                        placeholder="เช่น LOT2025001"
                      />
                    ) : (
                      <Select
                        value={newItem.slot_stock_id}
                        disabled={!newItem.slot_id || lotsForDispense.length === 0}
                        onValueChange={v => {
                          const ss = slotStocks.find(s => s.slot_stock_id === parseInt(v))
                          setNewItem(prev => ({
                            ...prev,
                            slot_stock_id: v,
                            lot_id: ss?.lot_id || "",
                            expired_at: ss?.expired_at || "",
                          }))
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs w-full min-w-0 overflow-hidden">
                          <span className="block truncate text-xs">
                            {newItem.slot_stock_id
                              ? (() => {
                                const ss = slotStocks.find(s => s.slot_stock_id === parseInt(newItem.slot_stock_id))
                                return ss
                                  ? `${ss.lot_id} — คงเหลือ ${getSlotStockAvailable(ss.slot_stock_id)} ชิ้น`
                                  : newItem.slot_stock_id
                              })()
                              : <span className="text-gray-400">
                                {!newItem.slot_id ? "เลือก Slot ก่อน"
                                  : lotsForDispense.length === 0 ? "ไม่มี Lot"
                                    : "เลือก Lot"}
                              </span>}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {lotsForDispense.map(ss => (
                            <SelectItem key={ss.slot_stock_id} value={ss.slot_stock_id.toString()} className="text-xs">
                              {ss.lot_id} — คงเหลือ {getSlotStockAvailable(ss.slot_stock_id)} ชิ้น
                              {ss.expired_at && ` (หมดอายุ ${ss.expired_at})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Expired At */}
                  <div className="col-span-5">
                    <Label className="text-xs">
                      วันหมดอายุยา
                      {form.task_type === "restock" ? " *" : ""}
                    </Label>
                    <Input
                      type="date" className="h-8 text-xs"
                      value={newItem.expired_at}
                      readOnly={form.task_type === "dispense"}
                      onChange={e => setNewItem(prev => ({ ...prev, expired_at: e.target.value }))}
                      placeholder={form.task_type === "dispense" ? "auto จาก Lot" : ""}
                    />
                  </div>

                  {/* dispense: available info */}
                  {form.task_type === "dispense" && newItem.slot_stock_id && (
                    <div className="col-span-2 flex items-end">
                      <p className="text-xs text-green-600 font-semibold">
                        max: {getSlotStockAvailable(parseInt(newItem.slot_stock_id))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Items list */}
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีรายการ</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">สินค้า</TableHead>
                    <TableHead className="text-xs">Slot</TableHead>
                    <TableHead className="text-xs">Lot ID</TableHead>
                    <TableHead className="text-xs">จำนวน</TableHead>
                    <TableHead className="text-xs">หมดอายุ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{idx + 1}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{item.product_name || item.product_id}</div>
                        <div className="text-gray-400 text-xs">{item.product_id}</div>
                      </TableCell>
                      <TableCell className="text-xs">#{item.slot_id}</TableCell>
                      <TableCell className="text-xs">{item.lot_id || "-"}</TableCell>
                      <TableCell className="text-xs font-semibold">{item.amount}</TableCell>
                      <TableCell className="text-xs">{item.expired_at || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsCreateOpen(false) }} disabled={createLoading}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createLoading || items.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createLoading
                ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />กำลังสร้าง...</span>
                : "สร้าง QR Task"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════
          QR VIEW DIALOG
      ══════════════════════════════════════════════════════════ */}
      <Dialog open={isQrViewOpen} onOpenChange={setIsQrViewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ดูและจัดการ QR Code</DialogTitle>
            <DialogDescription>แสดง QR Token และตัวเลือกการดาวน์โหลด</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* QR Code Display */}
            <div className="flex justify-center">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR Code" className="rounded-lg shadow-md" style={{ width: 240 }} />
                  : <div className="w-60 h-60 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">ไม่สามารถแสดง QR</div>
                }
              </div>
            </div>

            {/* QR Token */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">QR Token</label>
              <div className="flex gap-2">
                <code className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded font-mono text-xs text-gray-700 overflow-x-auto">
                  {selectedTask?.qr_token}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedTask?.qr_token) {
                      navigator.clipboard.writeText(selectedTask.qr_token)
                    }
                  }}
                  className="flex-shrink-0 h-8 px-2"
                  title="คัดลอกไปยังคลิปบอร์ด"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-3">
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-0.5">ตู้ยา</p>
                <p className="text-xs font-medium text-gray-900">Locker #{selectedTask?.locker_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-0.5">ประเภท</p>
                <div className="text-xs">{selectedTask && getTaskTypeBadge(selectedTask.task_type)}</div>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-0.5">สถานะ</p>
                <div className="text-xs">{selectedTask && getStatusBadge(selectedTask.status)}</div>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-0.5">ผู้รับมอบหมาย</p>
                <p className="text-xs font-medium text-gray-900">{selectedTask && getUserName(selectedTask.assigned_user_id)}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <DialogFooter className="flex gap-2 pt-1 border-t">
            <Button
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              <Download className="w-3 h-3 mr-1" />
              ดาวน์โหลด
            </Button>
            <Button
              onClick={() => { setIsQrViewOpen(false); selectedTask && openPo(selectedTask) }}
              className="flex-1 h-9 bg-orange-600 hover:bg-orange-700 text-white text-sm"
            >
              <Printer className="w-3 h-3 mr-1" />
              ออกใบ PO
            </Button>
            <Button
              onClick={() => setIsQrViewOpen(false)}
              variant="outline"
              className="flex-1 h-9 text-sm"
            >
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════
          PO PRINT DIALOG
      ══════════════════════════════════════════════════════════ */}
      <Dialog open={isPoOpen} onOpenChange={setIsPoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ใบสั่ง QR Task (PO)</DialogTitle></DialogHeader>
          <div ref={poRef} className="p-0">
            <div className=" pb-4 px-4 pt-4 text-center">
              <h1 className="text-xl font-bold text-gray-900">{currentUser?.groupLocationName}</h1>
              <p className="text-sm font-semibold text-gray-800">{currentUser?.locationName}</p>
              <p className="text-xs text-gray-500 mt-1">  Smart Locker System</p>

            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                ["Task ID", <span className="font-mono text-sm">{selectedTask?.task_id?.slice(0, 18)}...</span>],
                ["ประเภท", selectedTask?.task_type === "restock" ? "เติมยา (Restock)" : "เบิกยา (Dispense)"],
                ["สถานที่", <><p className="font-semibold">{currentUser?.locationName}</p><p className="text-xs text-gray-400">{currentUser?.groupLocationName}</p></>],
                ["ผู้ออกใบ", <><p className="font-semibold">{currentUser?.firstName} {currentUser?.lastName}</p></>],
                ["ตู้ยา", `Locker #${selectedTask?.locker_id} — ${selectedTask ? getLockerDetail(selectedTask.locker_id) : ""}`],
                ["ผู้รับมอบหมาย", selectedTask ? getUserName(selectedTask.assigned_user_id) : "-"],
                ["วันที่สร้าง", selectedTask ? new Date(selectedTask.created_at).toLocaleString("th-TH") : "-"],
                ["วันหมดอายุ QR", selectedTask?.expires_at ? new Date(selectedTask.expires_at).toLocaleString("th-TH") : "ไม่กำหนด"],
              ].map(([label, value], i) => (
                <div key={i} className="p-3 border rounded-lg">
                  <label className="text-xs text-gray-400 block mb-1">{label as string}</label>
                  <div className="font-semibold">{value as any}</div>
                </div>
              ))}
            </div>
            <h2 className="font-semibold mb-2">รายการยา ({selectedTask?.items_json?.length || 0} รายการ)</h2>
            <table className="w-full text-sm border-collapse mb-6">
              <thead>
                <tr className="bg-gray-50">
                  {["#", "ชื่อสินค้า", "Product ID", "Slot", "Lot ID", "จำนวน", "หมดอายุ"].map(h => (
                    <th key={h} className={`text-left p-2 border-b-2 border-gray-200 ${h === "จำนวน" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(selectedTask?.items_json || []).map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "" : "bg-gray-50/50"}>
                    <td className="p-2 border-b border-gray-100">{idx + 1}</td>
                    <td className="p-2 border-b border-gray-100 font-medium">{item.product_name || "-"}</td>
                    <td className="p-2 border-b border-gray-100 font-mono text-xs text-gray-500">{item.product_id}</td>
                    <td className="p-2 border-b border-gray-100">#{item.slot_id}</td>
                    <td className="p-2 border-b border-gray-100">{item.lot_id || "-"}</td>
                    <td className="p-2 border-b border-gray-100 text-right font-bold">{item.amount}</td>
                    <td className="p-2 border-b border-gray-100">{item.expired_at || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-8 p-6 border rounded-xl bg-gray-50">
              <div>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR" className="w-32 h-32 rounded" />
                  : <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">ไม่มี QR</div>
                }
                <p className="text-xs text-gray-400 text-center mt-1">สแกน QR เพื่อดำเนินการ</p>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">QR Token</p>
                <p className="font-mono text-sm font-bold break-all">{selectedTask?.qr_token}</p>
                <p className="text-xs text-gray-400 mt-3 mb-1">สถานะ</p>
                <div>{selectedTask && getStatusBadge(selectedTask.status)}</div>
              </div>
            </div>
            <p className="text-xs text-gray-300 text-center mt-6">
              พิมพ์โดย {currentUser?.firstName} {currentUser?.lastName} · {currentUser?.locationName} · {new Date().toLocaleString("th-TH")}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDownloadQr} disabled={!qrDataUrl}>
              <Download className="w-4 h-4 mr-2" />ดาวน์โหลด QR
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" />พิมพ์
            </Button>
            <Button variant="outline" onClick={() => setIsPoOpen(false)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════
          CANCEL DIALOG
      ══════════════════════════════════════════════════════════ */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              ยืนยันการยกเลิก QR Task
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>คุณต้องการยกเลิก QR Task นี้ใช่หรือไม่?</p>
                {selectedTask && (
                  <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                    <p><span className="text-gray-500">Task ID:</span> {selectedTask.task_id.slice(0, 18)}...</p>
                    <p><span className="text-gray-500">Locker:</span> #{selectedTask.locker_id}</p>
                    <p><span className="text-gray-500">ประเภท:</span> {selectedTask.task_type === "restock" ? "เติมยา" : "เบิกยา"}</p>
                  </div>
                )}
                <div className="bg-red-50 border border-red-200 rounded p-2 text-red-600 text-sm flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  การยกเลิกจะทำให้ QR Code ใช้ไม่ได้อีกต่อไป
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
              ยืนยันการยกเลิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}