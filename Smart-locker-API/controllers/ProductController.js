//Smart-locker-API/controllers/ProductController.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { get } = require('http');
require('dotenv').config();

const prisma = require('../lib/prisma');



module.exports = {
    ProductController: {
        
        createProduct: async (req, res) => {
            try {
                console.log('createProduct request body:', req.body);
                
                const {
                    product_id,
                    product_name,
                    product_detail,
                } = req.body;

                // ตรวจสอบข้อมูลที่จำเป็น
                if (!product_id || !product_name || !product_detail) {
                    return res.status(400).json({ 
                        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
                    });
                }


                // ตรวจสอบความซ้ำซ้อนแบบปกติด้วย WHERE
                const existingProduct = await prisma.product.findFirst({
                    where: {
                        OR: [
                            { product_id: product_id },
                        ].filter(obj => Object.keys(obj).length > 0)
                    }
                });

                if (existingProduct) {
                    return res.status(409).json({ 
                        message: 'ชื่อ Product นี้ถูกใช้งานแล้ว'
                    });
                }
                
                // สร้างผลิตภัณฑ์ใหม่
                const newProduct = await prisma.product.create({
                    data: {
                        product_id: product_id,
                        product_name: product_name,
                        product_detail: product_detail,
                        created_at: new Date(),
                        updated_at: null,
                        deleted_at: null
                    }
                });


                res.status(201).json({ 
                    message: 'สร้าง Product สำเร็จ',
                    product: {
                        product_id: newProduct.product_id,
                        product_name: newProduct.product_name,
                        product_detail: newProduct.product_detail,
                    }
                });

            } catch (error) {
                console.error('Create product error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        //ลบ Product
        deleteProduct : async (req, res) => {
            try {
                const {product_id} = req.body;

                if (!product_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ product_id'
                    });
                }

                // ตรวจสอบว่าผลิตภัณฑ์มีอยู่ในระบบหรือไม่
                const existingProduct = await prisma.product.findUnique({
                    where: {
                        product_id: product_id
                    }
                });

                if (!existingProduct) {
                    return res.status(404).json({ 
                        message: 'ไม่พบผลิตภัณฑ์ในระบบ'
                    });
                }

                // ลบผลิตภัณฑ์
                await prisma.product.delete({
                    where: {
                        product_id: product_id
                    }
                });

                res.status(200).json({ 
                    message: 'ลบผลิตภัณฑ์สำเร็จ'
                });


            } catch (error) {
                console.error('Delete product error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        //Edit User ข้อมูลผู้ใช้มีอะไรบ้างที่สามารถแก้ไขได้
        editProduct : async (req, res) => {
            try {
                // รับค่าจาก body
                const {product_id,product_name,product_detail,} = req.body;

                // ตรวจสอบว่ามี product_id หรือไม่
                if (!product_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ product_id'
                    });
                }

                // ตรวจสอบว่ามี Product มีอยู่ในระบบหรือไม่
                const existingProduct = await prisma.product.findUnique({
                    where: {
                        product_id: product_id
                    }
                });
                
                if (!existingProduct) {
                    return res.status(404).json({ 
                        message: 'ไม่พบผลิตภัณฑ์ในระบบ'
                    });
                }
                
                // สร้าง object สำหรับ update เฉพาะฟิลด์ที่ส่งมา
                const updateData = {};
                if (product_name) updateData.product_name = product_name;
                if (product_detail) updateData.product_detail = product_detail;

                // อัพเดทเวลาที่แก้ไข
                updateData.updated_at = new Date();

                // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
                if (Object.keys(updateData).length === 1) { // มีแค่ updated_at
                    return res.status(400).json({ 
                        message: 'กรุณาระบุข้อมูลที่ต้องการแก้ไข'
                    });
                }

                // อัพเดทข้อมูลผลิตภัณฑ์
                const updatedProduct = await prisma.product.update({
                    where: { product_id: product_id },
                    data: updateData
                })

                res.status(200).json({ 
                    message: 'แก้ไขข้อมูลผลิตภัณฑ์สำเร็จ',
                    user: updatedProduct
                });

            } catch (error) {
                
            }
        },

        getAllProducts: async (req, res) => {
                try {

                    const { search } = req.query;

                    let whereCondition = {};
                    if (search){
                        console.log('Search query:', search);
                        whereCondition = {
                            OR: [
                                { product_id: { contains: search, mode: 'insensitive' } },
                                { product_name: { contains: search, mode: 'insensitive' } },
                                { product_detail: { contains: search, mode: 'insensitive' } },
                            ]
                        };
                    }
                    
                    
                    const products = await prisma.product.findMany({
                        where: whereCondition,
                        select: {
                            product_id: true,
                            product_name: true,
                            product_detail: true,
                        },
                        orderBy: {
                            created_at: 'asc'
                        }
                    });

                    res.status(200).json({
                        message: 'ดึงข้อมูลผลิตภัณฑ์สำเร็จ',
                        products: products
                    });

                    const formattedProducts = products.map(product => ({
                        product_id: product.product_id,
                        product_name: product.product_name,
                        product_detail: product.product_detail,
                    }));

                    console.log('Formatted Products:', formattedProducts);
                } catch (error) {
                    console.error('Get all products error:', error);
                    res.status(500).json({
                        message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                        error: error.message
                    });
                }
            }
        }
};