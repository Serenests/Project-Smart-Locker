//Smart-locker-API/controllers/SlotController.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { get } = require('http');
require('dotenv').config();

const prisma = require('../lib/prisma');


module.exports = {
    SlotStockController: {
        
        createSlotStock: async (req, res) => {
            try {
                console.log('createSlotStock request body:', req.body);

                const {lot_id, product_id, slot_id, amount, expired_at } = req.body;

                // ตรวจสอบข้อมูลที่จำเป็น
                if (!lot_id || !product_id || !slot_id || !amount || !expired_at) {
                    return res.status(400).json({ 
                        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
                    });
                }

                // ดึงข้อมูล slot เพื่อเช็ค capacity
                const slot = await prisma.slot.findUnique({
                    where: {
                        slot_id: slot_id
                    }
                });

                // ตรวจสอบว่า slot มีอยู่จริงหรือไม่
                if (!slot) {
                    return res.status(404).json({ 
                        message: 'ไม่พบข้องที่ระบุ'
                    });
                }

                // ตรวจสอบว่า amount ไม่เกิน capacity
                if (amount > slot.capacity) {
                    return res.status(400).json({ 
                        message: `จำนวนสินค้า (${amount}) เกินความจุของช่อง (${slot.capacity})`
                    });
                }

                // หากต้องการตรวจสอบรวมกับสินค้าที่มีอยู่แล้วในช่อง (ถ้ามี)
                const existingStock = await prisma.slot_stock.aggregate({
                    where: {
                        slot_id: slot_id
                    },
                    _sum: {
                        amount: true
                    }
                });

                const currentAmount = existingStock._sum.amount || 0;
                const totalAmount = currentAmount + amount;

                if (totalAmount > slot.capacity) {
                    return res.status(400).json({ 
                        message: `จำนวนสินค้ารวม (${totalAmount}) เกินความจุของช่อง (${slot.capacity}). ปัจจุบันมีสินค้า ${currentAmount} ชิ้น`
                    });
                }

                // สร้าง slot_stock
                const newSlotStock = await prisma.slot_stock.create({
                    data: {
                        lot_id: lot_id,
                        product_id: product_id,
                        slot_id: slot_id,
                        amount: amount,
                        expired_at: expired_at
                    }
                });

                res.status(201).json({ 
                    message: 'สร้าง Slot in Stock สำเร็จ',
                    SlotStock: newSlotStock
                });

            } catch (error) {
                console.error('Create Slot in Stock error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        deleteSlotStock : async (req, res) => {
            try {
                const {slot_stock_id} = req.body;

                if (!slot_stock_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ slot_stock_id'
                    });
                }

                // ตรวจสอบว่ามี Slot มีอยู่ในระบบหรือไม่
                const existingSlotStock = await prisma.slot_stock.findUnique({
                    where: {
                        slot_stock_id: slot_stock_id
                    }
                });

                if (!existingSlotStock) {
                    return res.status(404).json({ 
                        message: 'ไม่พบ SlotStock ในระบบ'
                    });
                }

                // ลบข้อมูล Slot
                await prisma.slot_stock.delete({
                    where: {
                        slot_stock_id: slot_stock_id
                    }
                });

                res.status(200).json({ 
                    message: 'ลบ SlotStock สำเร็จ'
                });


            } catch (error) {
                console.error('Delete SlotStock error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        //Edit SlotStock
        editSlotStock: async (req, res) => {
            try {
                // รับค่าจาก body
                const {slot_stock_id, lot_id, product_id, amount, expired_at} = req.body;

                // ตรวจสอบว่ามี slot_stock_id หรือไม่
                if (!slot_stock_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ slot_stock_id'
                    });
                }

                // ตรวจสอบว่ามี SlotStock มีอยู่ในระบบหรือไม่
                const existingSlotStock = await prisma.slot_stock.findUnique({
                    where: {
                        slot_stock_id: slot_stock_id
                    }
                });

                if (!existingSlotStock) {
                    return res.status(404).json({
                        message: 'ไม่พบ SlotStock ในระบบ'
                    });
                }

                // ถ้ามีการแก้ไข amount ให้เช็ค capacity
                if (amount !== undefined && amount !== null) {
                    // ดึงข้อมูล slot เพื่อเช็ค capacity (ใช้ slot_id จาก existingSlotStock)
                    const slot = await prisma.slot.findUnique({
                        where: {
                            slot_id: existingSlotStock.slot_id
                        }
                    });

                    // ตรวจสอบว่า slot มีอยู่จริงหรือไม่
                    if (!slot) {
                        return res.status(404).json({ 
                            message: 'ไม่พบช่องที่ระบุ'
                        });
                    }

                    // ตรวจสอบว่า amount ไม่เกิน capacity
                    if (amount > slot.capacity) {
                        return res.status(400).json({ 
                            message: `จำนวนสินค้า (${amount}) เกินความจุของช่อง (${slot.capacity})`
                        });
                    }

                    // หากต้องการตรวจสอบรวมกับสินค้าที่มีอยู่แล้วในช่อง
                    const existingStock = await prisma.slot_stock.aggregate({
                        where: {
                            slot_id: existingSlotStock.slot_id,
                            slot_stock_id: {
                                not: slot_stock_id // ไม่นับรายการที่กำลังแก้ไข
                            }
                        },
                        _sum: {
                            amount: true
                        }
                    });

                    const currentAmount = existingStock._sum.amount || 0;
                    const totalAmount = currentAmount + amount; // amount ใหม่ + สินค้าอื่นในช่อง

                    if (totalAmount > slot.capacity) {
                        return res.status(400).json({ 
                            message: `จำนวนสินค้ารวม (${totalAmount}) เกินความจุของช่อง (${slot.capacity}). ปัจจุบันมีสินค้าอื่น ${currentAmount} ชิ้น`
                        });
                    }
                }
                
                // สร้าง object สำหรับ update เฉพาะฟิลด์ที่ส่งมา
                const updateData = {};
                if (lot_id !== undefined) updateData.lot_id = lot_id;
                if (product_id !== undefined) updateData.product_id = product_id;
                if (amount !== undefined) updateData.amount = amount;
                if (expired_at !== undefined) updateData.expired_at = expired_at;

                // อัพเดทเวลาที่แก้ไข
                updateData.updated_at = new Date();

                // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
                if (Object.keys(updateData).length === 1) { // มีแค่ updated_at
                    return res.status(400).json({ 
                        message: 'กรุณาระบุข้อมูลที่ต้องการแก้ไข'
                    });
                }

                // อัพเดทข้อมูล SlotStock
                const updatedSlotStock = await prisma.slot_stock.update({
                    where: {
                        slot_stock_id: slot_stock_id
                    },
                    data: updateData
                });
                
                res.status(200).json({ 
                    message: 'แก้ไข SlotStock สำเร็จ',
                    SlotStock: updatedSlotStock
                });

            } catch (error) {
                console.error('Edit SlotStock error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        getAllSlotStock: async (req, res) => {
            try {
                const slotStocks = await prisma.slot_stock.findMany();

                res.status(200).json({
                    message: 'ดึงข้อมูล SlotStock ทั้งหมด สำเร็จ',
                    slotStocks: slotStocks
                });


            } catch (error) {
                console.error('Get All SlotStocks error:', error);
                res.status(500).json({
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        }

        
    }
};