//server/controllers/UserLockerGrantContoller.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { create } = require('domain');
require('dotenv').config();

const prisma = require('../lib/prisma');

module.exports = {
    UserLockerGrantController: {
        createUserLockerGrant: async (req, res) => {
            try {
                const { user_id, granted_by,permission_withdraw, permission_restock, locker_id, location_id } = req.body;

                // ตรวจสอบข้อมูลที่จำเป็น
                if (!user_id || !locker_id || !granted_by || !location_id) {
                    return res.status(400).json({
                        message: "กรุณากรอกข้อมูลให้ครบถ้วน"
                    });
                }

                // ถ้า granted_by มีค่า role_id ใน user table เท่ากับ 1,2,3 เท่านั้นจึงจะสามารถสร้างการอนุญาตได้
                const grantingUser = await prisma.user.findUnique({
                    where: {
                        user_id: granted_by
                    }
                });

                if (!grantingUser || ![1, 2, 3].includes(grantingUser.role_id)) {
                    return res.status(403).json({
                        message: "คุณไม่มีสิทธิ์ในการสร้างการอนุญาตนี้"
                    });
                }

                const userLockerGrant = await prisma.user_locker_grant.create({
                    data: {
                        user_id,
                        granted_by,
                        permission_withdraw,
                        permission_restock,
                        locker_id,
                        location_id,
                        created_at: new Date(),
                        updated_at: null,
                        deleted_at: null
                    }
                });

                res.status(201).json(userLockerGrant);
            } catch (error) {
                console.error("Error creating user locker grant:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        },

        updateUserLockerGrant: async (req, res) => {
            try {
                const { user_locker_grant_id,user_id, granted_by,permission_withdraw, permission_restock, locker_id, location_id } = req.body;

                if ( !user_locker_grant_id || !user_id || !locker_id || !granted_by || (permission_withdraw === undefined) || (permission_restock === undefined) || !location_id) {
                    return res.status(400).json({
                        message: "กรุณากรอกข้อมูลให้ครบถ้วน"
                    });
                }

                const updatedGrant = await prisma.user_locker_grant.update({
                    where: {
                        user_locker_grant_id: user_locker_grant_id
                    },
                    data: {
                        user_id,
                        granted_by,
                        permission_withdraw,
                        permission_restock,
                        locker_id,
                        location_id,
                        updated_at: new Date()
                    }
                });

                res.status(200).json(updatedGrant);
            } catch (error) {
                console.error("Error updating user locker grant:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        },

        deleteUserLockerGrant: async (req, res) => {
            try {
                const {user_locker_grant_id} = req.body;

                if (!user_locker_grant_id) {
                    return res.status(400).json({
                        message: "กรุณาระบุ user_locker_grant_id"
                    });
                }
                
                await prisma.user_locker_grant.delete({
                    where: {
                        user_locker_grant_id: user_locker_grant_id
                    }
                });
                res.status(200).json({
                    message: "ลบการอนุญาตล็อกเกอร์ของผู้ใช้สำเร็จ"
                });


            } catch (error) {
                console.error("Error deleting user locker grant:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        },

        getAllUserLockerGrant: async (req, res) => {

            try {
                const userLockerGrants = await prisma.user_locker_grant.findMany({
                    include: {
                        User:{
                            select:{
                                first_name:true,
                                last_name:true,
                            }
                        },
                        Locker:{
                            select:{
                                locker_id:true,
                                locker_location_detail:true,
                            }
                        },
                        Location: {
                            select: {
                                location_name: true,
                            }
                        }
                    }
                });

                res.status(200).json(userLockerGrants);

            } catch (error) {
                console.error("Error fetching user locker grants:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        }

    }
}