// Product Management Page - smart-locker/app/(super-admin)/product-management/page.tsx
'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"

import { Search, Plus, Edit, Trash2, Eye, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"
import { authService, apiClient } from "@/lib/auth"
export default function ProductManagementPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [productToDelete, setProductToDelete] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [createFormLoading, setCreateFormLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [createForm, setCreateForm] = useState({
    product_id: "",
    product_name: "",
    product_detail: "",
  })

    // Edit form state
  const [editForm, setEditForm] = useState({
    product_name: "",
    product_detail: "",
  })

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product)
    setEditForm({
      product_name: product.product_name || "",
      product_detail: product.product_detail || "",
    })
    setIsEditDialogOpen(true)

    console.log("Editing product:", product)
  }

  const handleSubmitEdit = async () => {
      if (!selectedProduct) return

      try {
        setEditLoading(true)

      const response = await apiClient.post('/product/updateProduct', {
        product_id: selectedProduct.product_id,
        product_name: editForm.product_name,
        product_detail: editForm.product_detail,
      })

      setIsEditDialogOpen(false)

      // อัพเดทข้อมูลใน state ทันที
      setProducts(products.map(product => 
        product.product_id === selectedProduct.product_id 
          ? { ...product, product_name: editForm.product_name, product_detail: editForm.product_detail } 
          : product
      ))
      } catch (error: any) {
        console.error("Error editing product:", error)
        alert(`เกิดข้อผิดพลาด: ${error.message}`)
      }finally {
        setEditLoading(false)
      }
    }

  useEffect(() => {
    // ตรวจสอบ authentication
    if (!authService.isAuthenticated()) {
      console.log('❌ Not authenticated, redirecting to signin...');
      router.push('/signin');
      return;
    }
    if (authService.getUser().role !== 1 && authService.getUser().role !==3) {
      router.push('/dashboard');
      return;
    }
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.get('/product/getAllProducts')

      setProducts(Array.isArray(response.data.products) ? response.data.products : [])



    } catch (error) {
      console.error('Fetch products error:', error)
      setError('ไม่สามารถดึงข้อมูลผลิตภัณฑ์ได้')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.product_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product_detail?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentProducts = filteredProducts.slice(startIndex, endIndex)

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  //Dialog สำหรับเพิ่มยา
  const handleOpenCreateDialog = () => {
    setIsAddDialogOpen(true)
    setCreateForm({ product_id: "", product_name: "", product_detail: "" })
    console.log("Opening create product dialog")
  }

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product)
    console.log("View product:", product)
  }


  // ✅ ฟังก์ชันสร้างยาใหม่
  const handleSubmitCreateProduct = async () => {
    try {
      setCreateFormLoading(true)
    
      const response = await apiClient.post('/product/createProduct', createForm)
      
      console.log('Create response:', response.data)
      
      await fetchProducts()
      setIsAddDialogOpen(false)
      setCreateForm({ product_id: "", product_name: "", product_detail: "" })
      
    } catch (error: any) {
      console.error('Error creating product:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setCreateFormLoading(false)
    }
  }

  // ✅ ฟังก์ชันลบยา
  const handleDeleteProduct = async () => {
      if (!productToDelete) return

      try {
        setDeleteLoading(true)

      const response = await apiClient.post('/product/deleteProduct', {
        product_id: productToDelete.product_id
      })

      console.log('Delete response:', response.data)

      setProducts(products.filter(product => product.product_id !== productToDelete.product_id))
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)

    } catch (error: any) {
      console.error("Error deleting product:", error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setDeleteLoading(false)
    }
  }

  const confirmDeleteProduct = (product: any) => {
    setProductToDelete(product)
    setIsDeleteDialogOpen(true)
  }

  return (
    <div className="flex-1 space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">จัดการยา</h2>
          <p className="text-muted-foreground">จัดการรายการยา</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ค้นหายา, รหัสยา, หรือรายละเอียด"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          /> 
        </div>
        <Button className="bg-gray-800" onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มรายการยา
        </Button>
      </div>

      {/* Product Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการยาในระบบ</CardTitle>
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
                    onClick={fetchProducts}
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
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบยา</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? "ไม่พบยาในระบบที่ตรงกับการค้นหา" 
                  : "ยังไม่มียาในระบบ กรุณาเพิ่มยาหรือเชื่อมต่อฐานข้อมูล"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสยา</TableHead>
                  <TableHead>ชื่อยา</TableHead>
                  <TableHead>รายละเอียดยา</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProducts.map((product) => (
                  <TableRow key={product.product_id}>
                    <TableCell className="font-medium">
                      {product.product_id || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.product_name || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.product_detail || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm"  onClick={() => handleEditProduct(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {authService.getUser().role === 1 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => confirmDeleteProduct(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {!isLoading && filteredProducts.length > 0 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="text-sm text-gray-500">
                แสดง {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} จาก {filteredProducts.length} รายการ
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  ก่อนหน้า
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={currentPage === page ? "bg-gray-800" : ""}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  ถัดไป
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบยา</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบยา{" "}
              <span className="font-semibold text-gray-900">
                {productToDelete?.product_name}
              </span>
              {" "}ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setProductToDelete(null)
              }}
              disabled={deleteLoading}
            >
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>กำลังลบ...</span>
                </div>
              ) : (
                'ลบยา'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ✅ Create Product Dialog - ฟอร์มเพิ่มข้อมูล */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เพิ่มรายการยา</DialogTitle>
            <DialogDescription>
              เพิ่มข้อมูลของรายการยาใหม่ในระบบ
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create_product_id">รหัสยา *</Label>
                <Input
                  id="create_product_id"
                  value={createForm.product_id}
                  onChange={(e) => setCreateForm({...createForm, product_id: e.target.value})}
                  placeholder="เช่น MED001"
                />
              </div>
              <div>
                <Label htmlFor="create_product_name">ชื่อยา *</Label>
                <Input
                  id="create_product_name"
                  value={createForm.product_name}
                  onChange={(e) => setCreateForm({...createForm, product_name: e.target.value})}
                  placeholder="เช่น พาราเซตามอล"
                />
              </div>
              <div className="col-span-2"> 
                <Label htmlFor="create_product_detail">รายละเอียดยา *</Label>
                <Input
                  id="create_product_detail"
                  value={createForm.product_detail}
                  onChange={(e) => setCreateForm({...createForm, product_detail: e.target.value})}
                  placeholder="เช่น ยาแก้ปวด ลดไข้"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false)
                setCreateForm({ product_id: "", product_name: "", product_detail: "" })
              }}
              disabled={createFormLoading}
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSubmitCreateProduct}
              disabled={createFormLoading || !createForm.product_id || !createForm.product_name || !createForm.product_detail}
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

      {/* Edit Product Dialog - ฟอร์มแก้ไขข้อมูล */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขรายการยา</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลของรายการยา {selectedProduct?.product_name} {selectedProduct?.product_detail}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="edit_product_name">ชื่อยา *</Label>
                <Input
                  id="edit_product_name"
                  value={editForm.product_name}
                  onChange={(e) => setEditForm({...editForm, product_name: e.target.value})}
                  placeholder="เช่น พาราเซตามอล"
                />
              </div>
              <div>
                <Label htmlFor="edit_product_detail">รายละเอียดยา *</Label>
                <Input
                  id="edit_product_detail"
                  value={editForm.product_detail}
                  onChange={(e) => setEditForm({...editForm, product_detail: e.target.value})}
                  placeholder="เช่น ยาแก้ปวด ลดไข้"
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
              disabled={editLoading || !editForm.product_name || !editForm.product_detail}
            >
              {editLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              
            </Button>
          
          </DialogFooter>

        </DialogContent>

        
      </Dialog>
    </div>
  )
}