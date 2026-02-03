//Smart-locker-API/controllers/CameraController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const prisma = require('../lib/prisma');


module.exports = {
    CameraController: {
        
        createCamera: async (req, res) => {
            try {
                console.log('create Camera request body:', req.body);
                
                const { slot_id } = req.body;

                // ตรวจสอบข้อมูลที่จำเป็น
                if (!slot_id) {
                    return res.status(400).json({ 
                        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
                    });
                }


                
                
                
                //คอลลั่มต้องตรงกับใน schema.prisma
                const newCamera = await prisma.camera.create({
                    data: {
                        slot_id: slot_id,
                        created_at: new Date(),
                        updated_at: null,
                        deleted_at: null
                    }
                });


                res.status(201).json({ 
                    message: 'สร้าง Slot สำเร็จ',
                    Camera: newCamera
                });

            } catch (error) {
                console.error('Create Camera error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        deleteCamera : async (req, res) => {
            try {
                const {camera_id} = req.body;

                if (!camera_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ camera_id'
                    });
                }

                // ตรวจสอบว่ามี Camera มีอยู่ในระบบหรือไม่
                const existingCamera = await prisma.camera.findUnique({
                    where: {
                        camera_id: camera_id
                    }
                });

                if (!existingCamera) {
                    return res.status(404).json({ 
                        message: 'ไม่พบ Camera ในระบบ'
                    });
                }

                // ลบข้อมูล Camera
                await prisma.camera.delete({
                    where: {
                        camera_id: camera_id
                    }
                });

                res.status(200).json({ 
                    message: 'ลบ Camera สำเร็จ'
                });


            } catch (error) {
                console.error('Delete Camera error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        //Edit Camera
        editCamera : async (req, res) => {
            try {
                // รับค่าจาก body
                const {camera_id,slot_id} = req.body;

                // ตรวจสอบว่ามี camera_id หรือไม่
                if ( !camera_id || !slot_id ) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ camera_id'
                    });
                }

                // ตรวจสอบว่ามี Slot มีอยู่ในระบบหรือไม่
                const existingCamera = await prisma.camera.findUnique({
                    where: {
                        camera_id: camera_id,

                    }
                });
                
                if (!existingCamera) {
                    return res.status(404).json({ 
                        message: 'ไม่พบ Camera ในระบบ'
                    });
                }
                
                // สร้าง object สำหรับ update เฉพาะฟิลด์ที่ส่งมา
                const updateData = {};
                if (slot_id) updateData.slot_id = slot_id;

                // อัพเดทเวลาที่แก้ไข
                updateData.updated_at = new Date();

                // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
                if (Object.keys(updateData).length === 1) { // มีแค่ updated_at
                    return res.status(400).json({ 
                        message: 'กรุณาระบุข้อมูลที่ต้องการแก้ไข'
                    });
                }

                // อัพเดทข้อมูล Camera
                const updatedCamera = await prisma.camera.update({
                    where: {
                        camera_id: camera_id
                    },
                    data: updateData
                });
                
                res.status(200).json({ 
                    message: 'แก้ไข Camera สำเร็จ',
                    Camera: updatedCamera
                });

            } catch (error) {
                console.error('Edit Slot error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        }
    }
};