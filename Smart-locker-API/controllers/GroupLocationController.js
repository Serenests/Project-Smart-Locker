//Smart-locker-API/controllers/GroupLocationController.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const prisma = require('../lib/prisma');
const { get } = require('http');


module.exports = {
    GroupLocationController: {
        
        createGroupLocation: async (req, res) => {
            try {
                console.log('createGroupLocation request body:', req.body);
                
                const {group_location_name } = req.body;

                // ตรวจสอบข้อมูลที่จำเป็น
                if (!group_location_name) {
                    return res.status(400).json({ 
                        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
                    });
                }


                // ตรวจสอบความซ้ำซ้อนแบบปกติด้วย WHERE
                const existingGroupLocation = await prisma.Group_Location.findFirst({
                    where: {
                        OR: [
                            { group_location_name: group_location_name },
                        ].filter(obj => Object.keys(obj).length > 0)
                    }
                });

                if (existingGroupLocation) {
                    return res.status(409).json({ 
                        message: 'ชื่อ GroupLocation นี้ถูกใช้งานแล้ว'
                    });
                }
                
                // สร้างกลุ่มสถานที่ใหม่ group_location_id: //auto increment int
                const newGroupLocation = await prisma.Group_Location.create({
                    data: {
                        group_location_name: group_location_name,
                        created_at: new Date(),
                        updated_at: null,
                        deleted_at: null
                    }
                });


                res.status(201).json({ 
                    message: 'สร้าง GroupLocation สำเร็จ',
                    GroupLocation: newGroupLocation
                });

            } catch (error) {
                console.error('Create GroupLocation error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        deleteGroupLocation : async (req, res) => {
            try {
                const {group_location_id} = req.body;

                if (!group_location_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ group_location_id'
                    });
                }

                // ตรวจสอบว่ากลุ่มสถานที่มีอยู่ในระบบหรือไม่
                const existingGroupLocation = await prisma.Group_Location.findUnique({
                    where: {
                        group_location_id: group_location_id
                    }
                });

                if (!existingGroupLocation) {
                    return res.status(404).json({ 
                        message: 'ไม่พบกลุ่มสถานที่ในระบบ'
                    });
                }

                // ลบกลุ่มสถานที่
                await prisma.Group_Location.delete({
                    where: {
                        group_location_id: group_location_id
                    }
                });

                res.status(200).json({ 
                    message: 'ลบกลุ่มสถานที่สำเร็จ'
                });


            } catch (error) {
                console.error('Delete group_location error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        //Edit GroupLocation ข้อมูลผู้ใช้มีอะไรบ้างที่สามารถแก้ไขได้
        editGroupLocation : async (req, res) => {
            try {
                // รับค่าจาก body
                const { group_location_id, group_location_name} = req.body;

                // ตรวจสอบว่ามี group_location_id หรือไม่
                if (!group_location_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ group_location_id'
                    });
                }

                // ตรวจสอบว่ามี group_location มีอยู่ในระบบหรือไม่
                const existingGroupLocation = await prisma.Group_Location.findUnique({
                    where: {
                        group_location_id: group_location_id
                    }
                });
                
                if (!existingGroupLocation) {
                    return res.status(404).json({ 
                        message: 'ไม่พบกลุ่มสถานที่ในระบบ'
                    });
                }
                
                // สร้าง object สำหรับ update เฉพาะฟิลด์ที่ส่งมา
                const updateData = {};
                if (group_location_name) updateData.group_location_name = group_location_name;

                // อัพเดทเวลาที่แก้ไข
                updateData.updated_at = new Date();

                // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
                if (Object.keys(updateData).length === 1) { // มีแค่ updated_at
                    return res.status(400).json({ 
                        message: 'กรุณาระบุข้อมูลที่ต้องการแก้ไข'
                    });
                }

                // อัพเดทข้อมูลกลุ่มสถานที่
                const updatedUser = await prisma.Group_Location.update({
                    where: { group_location_id: group_location_id },
                    data: updateData
                })
                
                res.status(200).json({ 
                    message: 'แก้ไขกลุ่มสถานที่สำเร็จ',
                    GroupLocation: updatedUser
                });

            } catch (error) {
                console.error('Edit GroupLocation error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        getAllGroupLocations: async (req, res) => {
            try {
                const groupLocations = await prisma.group_Location.findMany({
                    where: { deleted_at: null },
                    select: {
                        group_location_id: true,
                        group_location_name: true
                    },
                    orderBy: { group_location_name: 'asc' }
                });
                
                res.status(200).json({ 
                    message: 'ดึงข้อมูลกลุ่มสถานที่สำเร็จ',
                    groupLocations 
                });
                
            } catch (error) {
                    res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาด',
                    error: error.message 
                });
            }
        },

        getGroupLocationById: async (req, res) => {
            try {
                const { group_location_id } = req.params;

                const groupLocation = await prisma.Group_Location.findUnique({
                    where: {
                        group_location_id: parseInt(group_location_id)
                    }
                });
                
                if (!groupLocation) {
                    return res.status(404).json({ 
                        message: 'ไม่พบกลุ่มสถานที่ในระบบ'
                    });
                }

                res.status(200).json({ 
                    message: 'ดึงข้อมูลกลุ่มสถานที่สำเร็จ',
                    groupLocation 
                });
            } catch (error) {
                console.error('Get GroupLocation by ID error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        }
    }
};