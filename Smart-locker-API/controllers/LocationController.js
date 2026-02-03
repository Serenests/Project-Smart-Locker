//Smart-locker-API/controllers/LocationController.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const prisma = require('../lib/prisma');


module.exports = {
    LocationController: {
        
        createLocation: async (req, res) => {
            try {
                console.log('createLocation request body:', req.body);
                
                const {location_name, group_location_id, latitude, longitude} = req.body;

                // ตรวจสอบข้อมูลที่จำเป็น
                if (!location_name || !group_location_id || !latitude || !longitude) {
                    return res.status(400).json({ 
                        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
                    });
                }


                // ตรวจสอบความซ้ำซ้อนแบบปกติด้วย WHERE
                const existingLocation = await prisma.Location.findFirst({
                    where: {
                        OR: [
                            { location_name: location_name },
                        ].filter(obj => Object.keys(obj).length > 0)
                    }
                });

                if (existingLocation) {
                    return res.status(409).json({ 
                        message: 'ชื่อ Location นี้ถูกใช้งานแล้ว'
                    });
                }
                
                // สร้างกลุ่มสถานที่ใหม่ group_location_id: //auto increment int
                //คอลลั่มต้องตรงกับใน schema.prisma
                const newLocation = await prisma.Location.create({
                    data: {
                        group_location_id: group_location_id,
                        location_name: location_name,
                        latitude: latitude,
                        longitude: longitude,
                        created_at: new Date(),
                        updated_at: null,
                        deleted_at: null
                    }
                });


                res.status(201).json({ 
                    message: 'สร้าง Location สำเร็จ',
                    Location: newLocation
                });

            } catch (error) {
                console.error('Create Location error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        deleteLocation : async (req, res) => {
            try {
                const {location_id} = req.body;

                if (!location_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ location_id'
                    });
                }

                // ตรวจสอบว่าสถานที่มีอยู่ในระบบหรือไม่
                const existingLocation = await prisma.Location.findUnique({
                    where: {
                        location_id: location_id
                    }
                });

                if (!existingLocation) {
                    return res.status(404).json({ 
                        message: 'ไม่พบสถานที่ในระบบ'
                    });
                }

                // ลบกลุ่มสถานที่
                await prisma.Location.delete({
                    where: {
                        location_id: location_id
                    }
                });

                res.status(200).json({ 
                    message: 'ลบสถานที่สำเร็จ'
                });


            } catch (error) {
                console.error('Delete location error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        //Edit Location ข้อมูลผู้ใช้มีอะไรบ้างที่สามารถแก้ไขได้
        editLocation : async (req, res) => {
            try {
                // รับค่าจาก body
                const { location_id, location_name, group_location_id, latitude, longitude} = req.body;

                // ตรวจสอบว่ามี group_location_id หรือไม่
                if (!location_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ location_id'
                    });
                }

                // ตรวจสอบว่ามี location มีอยู่ในระบบหรือไม่
                const existingLocation = await prisma.Location.findUnique({
                    where: {
                        location_id: location_id
                    }
                });
                
                if (!existingLocation) {
                    return res.status(404).json({ 
                        message: 'ไม่พบสถานที่ในระบบ'
                    });
                }
                
                // สร้าง object สำหรับ update เฉพาะฟิลด์ที่ส่งมา
                const updateData = {};
                if (location_name) updateData.location_name = location_name;
                if (group_location_id) updateData.group_location_id = group_location_id;
                if (latitude) updateData.latitude = latitude;
                if (longitude) updateData.longitude = longitude;

                // อัพเดทเวลาที่แก้ไข
                updateData.updated_at = new Date();

                // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
                if (Object.keys(updateData).length === 1) { // มีแค่ updated_at
                    return res.status(400).json({ 
                        message: 'กรุณาระบุข้อมูลที่ต้องการแก้ไข'
                    });
                }

                // อัพเดทข้อมูลสถานที่
                const updatedLocation = await prisma.Location.update({
                    where: {
                        location_id: location_id
                    },
                    data: updateData
                });
                
                res.status(200).json({ 
                    message: 'แก้ไขสถานที่สำเร็จ',
                    Location: updatedLocation
                });

            } catch (error) {
                console.error('Edit Location error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        getAllLocations: async (req, res) => {
            try {
                const locations = await prisma.location.findMany({
                    where: { deleted_at: null },
                    select: {
                        group_location_id: true,
                        location_id: true,
                        location_name: true,
                        latitude: true,
                        longitude: true,
                        "Group_Location": {
                            select: {
                                group_location_name: true
                            }
                        }
                    },
                    orderBy: { location_name: 'asc' }

                });

                console.log('Fetched locations:', locations);
                
                res.status(200).json({ 
                        message: 'ดึงข้อมูลสถานที่สำเร็จ',
                        locations 
                });
                
            } catch (error) {
                res.status(500).json({ 
                message: 'เกิดข้อผิดพลาด',
                error: error.message 
                });
            }
        },

        
        getLocationsByGroupLocationId: async (req, res) => {
        try {
            const { group_location_id } = req.query;

            if (!group_location_id) {
            return res.status(400).json({ 
                message: 'กรุณาระบุ group_location_id',
                locations: []
            });
            }

            const locations = await prisma.location.findMany({
            where: { 
                group_location_id: parseInt(group_location_id),
                deleted_at: null 
            },
            select: {
                location_id: true,
                location_name: true,
                group_location_id: true,
                latitude: true,
                longitude: true,
                Group_Location:{
                    select:{
                        group_location_name: true
                    }
                }
            },
            orderBy: { location_name: 'asc' }
            });

            res.status(200).json({ 
                message: 'ดึงข้อมูลสถานที่สำเร็จ',
                locations 
            });

            } catch (error) {
                console.error('Get locations by group error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาด',
                    error: error.message,
                    locations: []
                });
            }
        }
    }
};