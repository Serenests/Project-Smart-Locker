//Smart-locker-API/controllers/SlotController.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { get } = require('http');
require('dotenv').config();

const prisma = require('../lib/prisma');


module.exports = {
    SlotController: {
        
        createSlot: async (req, res) => {
            try {
                console.log('createSlot request body:', req.body);
                
                const { locker_id, location_id, capacity } = req.body;

                // ตรวจสอบข้อมูลที่จำเป็น
                if (!locker_id || !location_id || !capacity) {
                    return res.status(400).json({ 
                        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
                    });
                }


                
                
                
                //คอลลั่มต้องตรงกับใน schema.prisma
                const newSlot = await prisma.slot.create({
                    data: {
                        locker_id: locker_id,
                        location_id: location_id,
                        slot_status: null,
                        capacity: capacity,
                        created_at: new Date(),
                        updated_at: null,
                        deleted_at: null
                    }
                });


                res.status(201).json({ 
                    message: 'สร้าง Slot สำเร็จ',
                    Slot: newSlot
                });

            } catch (error) {
                console.error('Create Slot error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        deleteSlot : async (req, res) => {
            try {
                const {slot_id} = req.body;

                if (!slot_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ slot_id'
                    });
                }

                // ตรวจสอบว่ามี Slot มีอยู่ในระบบหรือไม่
                const existingSlot = await prisma.slot.findUnique({
                    where: {
                        slot_id: slot_id
                    }
                });

                if (!existingSlot) {
                    return res.status(404).json({ 
                        message: 'ไม่พบ Slot ในระบบ'
                    });
                }

                // ลบข้อมูล Slot
                await prisma.slot.delete({
                    where: {
                        slot_id: slot_id
                    }
                });

                res.status(200).json({ 
                    message: 'ลบ Slot สำเร็จ'
                });


            } catch (error) {
                console.error('Delete Slot error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        //Edit Slot
        editSlot : async (req, res) => {
            try {
                // รับค่าจาก body
                const {slot_id, locker_id,capacity} = req.body;

                // ตรวจสอบว่ามี locker_id หรือไม่
                if (!slot_id ) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ location_id'
                    });
                }

                // ตรวจสอบว่ามี Slot มีอยู่ในระบบหรือไม่
                const existingSlot = await prisma.slot.findUnique({
                    where: {
                        slot_id: slot_id
                    }
                });
                
                if (!existingSlot) {
                    return res.status(404).json({ 
                        message: 'ไม่พบ Locker ในระบบ'
                    });
                }
                
                // สร้าง object สำหรับ update เฉพาะฟิลด์ที่ส่งมา
                const updateData = {};
                if (locker_id) updateData.locker_id = locker_id;
                if (capacity) updateData.capacity = capacity;

                // อัพเดทเวลาที่แก้ไข
                updateData.updated_at = new Date();

                // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
                if (Object.keys(updateData).length === 1) { // มีแค่ updated_at
                    return res.status(400).json({ 
                        message: 'กรุณาระบุข้อมูลที่ต้องการแก้ไข'
                    });
                }

                // อัพเดทข้อมูลล็อกเกอร์
                const updatedSlot = await prisma.slot.update({
                    where: {
                        slot_id: slot_id
                    },
                    data: updateData
                });
                
                res.status(200).json({ 
                    message: 'แก้ไข Slot สำเร็จ',
                    Slot: updatedSlot
                });

            } catch (error) {
                console.error('Edit Slot error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        getAllSlot: async (req, res) => {
            try {
                const slots = await prisma.slot.findMany();

                res.status(200).json({
                    message: 'ดึงข้อมูล Slot ทั้งหมด สำเร็จ',
                    slots: slots
                });


            } catch (error) {
                console.error('Get All Slots error:', error);
                res.status(500).json({
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },
        
        getSlotsByLockerId: async (req, res) => {
            try {
                const { locker_id } = req.params;

                if (!locker_id) {
                    return res.status(400).json({
                        message: 'กรุณาระบุ locker_id'
                    });
                }

                const slots = await prisma.slot.findMany({
                    where: {
                        locker_id: parseInt(locker_id)
                    },
                    include:{
                        Slot_stock:{
                            select:{
                                slot_stock_id: true,
                                lot_id: true,
                                product_id: true,
                                amount: true,
                                expired_at: true,
                                Product:{
                                    select:{
                                        product_name: true
                                    }
                                }
                            }
                        }
                    }
                });

                res.status(200).json({
                    message: 'ดึงข้อมูล Slot สำเร็จ',
                    slots: slots
                });

            } catch (error) {
                console.error('Get Slots By Locker ID error:', error);
                res.status(500).json({
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        }
    }
};