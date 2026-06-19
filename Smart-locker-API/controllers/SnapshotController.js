// SnapshotController.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { get } = require("http");
const prisma = new PrismaClient();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = {
  SnapshotController: {
    saveSnapshot: async (req, res) => {
      try {
        const {
          image_path,
          transaction_id,
          transaction_detail_id,
          slot_stock_id,
          camera_id,
          created_at,
          updated_at,
          deleted_at,
        } = req.body;

        // Validate
        if (!image_path || !transaction_id) {
          return res.status(400).json({
            message: "ข้อมูลไม่ครบถ้วน",
          });
        }

        // บันทึกลง database
        const snapshot = await prisma.snapshot.create({
          data: {
            image_path: image_path, // Cloudinary URL
            transaction_id: parseInt(transaction_id),
            transaction_detail_id: parseInt(transaction_detail_id),
            slot_stock_id: parseInt(slot_stock_id),
            camera_id: parseInt(camera_id),
            created_at: created_at ? new Date(created_at) : new Date(),
            updated_at: null,
            deleted_at: deleted_at ? new Date(deleted_at) : null,
          },
        });

        console.log("บันทึก snapshot สำเร็จ:", snapshot.snapshot_id);

        res.status(201).json({
          message: "บันทึก snapshot สำเร็จ",
          snapshot: snapshot,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึก snapshot" });
      }
    },

    getSnapshotsByTransaction: async (req, res) => {
      try {
        const { transaction_id } = req.params;

        const snapshots = await prisma.snapshot.findMany({
          where: {
            transaction_id: parseInt(transaction_id),
            deleted_at: null,
          },
          include: {
            Camera: true,
            Transaction_detail: {
              include: {
                Product: true,
                Slot: true,
                Transaction: true,
              },
            },
          },
          orderBy: {
            created_at: "asc",
          },
        });
        res.status(200).json({
          message: "ดึง snapshot สำเร็จ",
          snapshots: snapshots,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึง snapshot" });
      }
    },
    // 2. ฟังก์ชันดึงรายชื่อไฟล์
    getFilesInFolder: async (req, res) => {
      try {
        // สมมติว่าหน้าบ้านส่ง path มาทาง Query (เช่น ?path=SmartLocker/1/Txn_93/Slot_S1)
        // หรือจะรับเป็น params ทีละตัวมาประกอบร่างเองก็ได้ครับ
        const folderPath = req.query.path;

        if (!folderPath) {
          return res.status(400).json({ error: "กรุณาระบุ folder path" });
        }

        // 🌟 ยิงคำสั่งไปถาม Cloudinary
        const result = await cloudinary.api.resources({
          type: "upload",
          prefix: folderPath, // บอกให้หาเฉพาะไฟล์ที่ขึ้นต้นด้วยโฟลเดอร์นี้
          resource_type: "image", // ดึงเฉพาะรูปภาพ (ที่คุณบอกว่าเป็น JPG ทั้งหมด)
          max_results: 100, // จำกัดจำนวนไฟล์สูงสุดเพื่อไม่ให้ API หน่วง
        });

        // 🌟 แปลงข้อมูลให้ออกมาเป็นแค่ "ชื่อไฟล์.jpg" แบบที่หน้าบ้านเราต้องการ
        const fileNames = result.resources.map((file) => {
          // สิ่งที่ Cloudinary ส่งมา (public_id) จะเป็น: "SmartLocker/1/Txn_93/Slot_S1/1_before"
          // เราใช้ .split('/').pop() เพื่อตัดเอาเฉพาะคำว่า "1_before"
          const rawName = file.public_id.split("/").pop();

          // เอามาต่อกับนามสกุลไฟล์ (file.format จะมีค่าเป็น 'jpg' หรือ 'png')
          return `${rawName}.${file.format}`;
        });

        // ส่งกลับไปให้หน้าบ้าน Next.js
        return res.json({
          folder: folderPath,
          files: fileNames,
        });
      } catch (error) {
        console.error("Cloudinary Error:", error);
        return res.status(500).json({ error: "ไม่สามารถดึงข้อมูลรูปภาพได้" });
      }
    },
  },
};
