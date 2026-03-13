// SnapshotController.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { get } = require("http");
const prisma = new PrismaClient();

module.exports = {
    SnapshotController:{
        saveSnapshot: async (req, res) => {
            try {
                const {
                   image_path, transaction_id, transaction_detail_id,
                   slot_stock_id, camera_id, created_at, updated_at, deleted_at
                } = req.body;
    
                // Validate
                if (!image_path || !transaction_id) {
                    return res.status(400).json({ 
                        message: 'ข้อมูลไม่ครบถ้วน' 
                    });
                }

                // บันทึกลง database
                const snapshot = await prisma.snapshot.create({
                    data: {
                        image_path: image_path,  // Cloudinary URL
                        transaction_id: parseInt(transaction_id),
                        transaction_detail_id: parseInt(transaction_detail_id),
                        slot_stock_id: parseInt(slot_stock_id),
                        camera_id: parseInt(camera_id),
                        created_at: created_at ? new Date(created_at) : new Date(),
                        updated_at: null,
                        deleted_at: deleted_at ? new Date(deleted_at) : null,
                    }
                });

                console.log('บันทึก snapshot สำเร็จ:', snapshot.snapshot_id);

                res.status(201).json({
                    message: 'บันทึก snapshot สำเร็จ',
                    snapshot: snapshot
                });

            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึก snapshot' });
            }
        },

        getSnapshotsByTransaction: async (req, res) => {
            try {
                const {transaction_id} = req.params;

                const snapshots = await prisma.snapshot.findMany({
                    where: {
                        transaction_id: parseInt (transaction_id),
                        deleted_at: null
                    },
                    include: {
                        Camera: true,
                        Transaction_detail:{
                            include: {
                                Product: true,
                                Slot: true
                            }
                        }
                    },
                    orderBy:{
                        created_at: 'asc'
                    }
                })
                res.status(200).json({
                    message: 'ดึง snapshot สำเร็จ',
                    snapshots: snapshots
                });

            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึง snapshot' });
            }
        }
    }
};
