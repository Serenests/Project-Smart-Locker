//Smart-locker-API/controllers/CameraController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv").config();

const prisma = require("../lib/prisma");

module.exports = {
  CameraController: {
    createCamera: async (req, res) => {
      try {
        console.log("create Camera request body:", req.body);

        const { slot_id } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!slot_id) {
          return res.status(400).json({
            message: "กรุณากรอกข้อมูลให้ครบถ้วน",
          });
        }

        //คอลลั่มต้องตรงกับใน schema.prisma
        const newCamera = await prisma.camera.create({
          data: {
            slot_id: slot_id,
            created_at: new Date(),
            updated_at: null,
            deleted_at: null,
          },
        });

        res.status(201).json({
          message: "สร้าง Slot สำเร็จ",
          Camera: newCamera,
        });
      } catch (error) {
        console.error("Create Camera error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    deleteCamera: async (req, res) => {
      try {
        const { camera_id } = req.body;

        if (!camera_id) {
          return res.status(400).json({
            message: "กรุณาระบุ camera_id",
          });
        }

        // ตรวจสอบว่ามี Camera มีอยู่ในระบบหรือไม่
        const existingCamera = await prisma.camera.findUnique({
          where: {
            camera_id: camera_id,
          },
        });

        if (!existingCamera) {
          return res.status(404).json({
            message: "ไม่พบ Camera ในระบบ",
          });
        }

        // ลบข้อมูล Camera
        await prisma.camera.delete({
          where: {
            camera_id: camera_id,
          },
        });

        res.status(200).json({
          message: "ลบ Camera สำเร็จ",
        });
      } catch (error) {
        console.error("Delete Camera error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    //Edit Camera
    editCamera: async (req, res) => {
      try {
        // รับค่าจาก body
        const { camera_id, slot_id } = req.body;

        // ตรวจสอบว่ามี camera_id หรือไม่
        if (!camera_id || !slot_id) {
          return res.status(400).json({
            message: "กรุณาระบุ camera_id",
          });
        }

        // ตรวจสอบว่ามี Slot มีอยู่ในระบบหรือไม่
        const existingCamera = await prisma.camera.findUnique({
          where: {
            camera_id: camera_id,
          },
        });

        if (!existingCamera) {
          return res.status(404).json({
            message: "ไม่พบ Camera ในระบบ",
          });
        }

        // สร้าง object สำหรับ update เฉพาะฟิลด์ที่ส่งมา
        const updateData = {};
        if (slot_id) updateData.slot_id = slot_id;

        // อัพเดทเวลาที่แก้ไข
        updateData.updated_at = new Date();

        // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
        if (Object.keys(updateData).length === 1) {
          // มีแค่ updated_at
          return res.status(400).json({
            message: "กรุณาระบุข้อมูลที่ต้องการแก้ไข",
          });
        }

        // อัพเดทข้อมูล Camera
        const updatedCamera = await prisma.camera.update({
          where: {
            camera_id: camera_id,
          },
          data: updateData,
        });

        res.status(200).json({
          message: "แก้ไข Camera สำเร็จ",
          Camera: updatedCamera,
        });
      } catch (error) {
        console.error("Edit Slot error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    getCamerasBySlotId: async (req, res) => {
      try {
        const { slot_id } = req.params;

        if (!slot_id) {
          return res.status(400).json({
            message: "กรุณาระบุ slot_id",
          });
        }

        const cameras = await prisma.camera.findMany({
          where: {
            slot_id: parseInt(slot_id),
          },
        });

        res.status(200).json({
          message: "ดึงข้อมูล Camera สำเร็จ",
          cameras: cameras,
        });
      } catch (error) {
        console.error("Get Cameras by Slot ID error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    syncSnapshot: async (req, res) => {
      try {
        // 1. รับค่าที่ส่งมาจาก camera_sync_agent.py
        const {
          transaction_id,
          slot_id,
          camera_amount,
          action_type,
          image_path,
        } = req.body;

        // 2. หา camera_id ของช่องนี้ (ตกลงกันว่า 1 ช่องมีกล้อง 1 ตัว)
        const camera = await prisma.camera.findFirst({
          where: { slot_id: parseInt(slot_id) },
        });

        if (!camera) {
          return res
            .status(404)
            .json({ error: "ไม่พบข้อมูลกล้องสำหรับช่องนี้ในระบบ" });
        }

        // 3. หา Transaction_detail ที่ตรงกับ transaction_id และ slot_id นี้
        const txDetail = await prisma.transaction_detail.findFirst({
          where: {
            transaction_id: parseInt(transaction_id),
            slot_id: parseInt(slot_id),
          },
        });

        if (!txDetail) {
          // ⚠️ จุดสำคัญ: ถ้าหาไม่เจอ อาจจะเพราะฝั่งตู้ยัง Sync Transaction หลักมาไม่ถึง
          return res.status(404).json({
            error:
              "ไม่พบ Transaction Detail (อาจจะยัง Sync ข้อมูลรายการไม่เสร็จ)",
          });
        }

        // 4. ตรวจสอบข้อขัดแย้ง (Discrepancy)
        const parsedCameraAmount =
          camera_amount != null ? parseInt(camera_amount) : null;
        // เทียบยอดที่ user กดทำรายการ (txDetail.amount) กับยอดที่ AI นับได้ (camera_amount)
        const isDiscrepancy =
          parsedCameraAmount === null
            ? true
            : txDetail.amount !== parsedCameraAmount;

        // 5. บันทึกข้อมูลลงฐานข้อมูลแบบรวดเดียว (Transaction)
        await prisma.$transaction([
          // 5.1 อัปเดตข้อมูลในตาราง Transaction_detail
          prisma.transaction_detail.update({
            where: { transaction_detail_id: txDetail.transaction_detail_id },
            data: {
              camera_amount: parsedCameraAmount,
              is_discrepancy: isDiscrepancy,
            },
          }),

          // 5.2 สร้างข้อมูลในตาราง Snapshot เก็บแค่ Path ย่อๆ ของ Cloudinary
          prisma.snapshot.create({
            data: {
              image_path: image_path,
              camera_id: camera.camera_id,
              transaction_id: parseInt(transaction_id),
              transaction_detail_id: txDetail.transaction_detail_id,
              slot_stock_id: txDetail.slot_stock_id,
            },
          }),
        ]);

        return res.status(200).json({
          message: "ซิงค์ข้อมูลภาพและประมวลผล Discrepancy สำเร็จ!",
        });
      } catch (error) {
        console.error("🔥 Error in syncSnapshot:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    },
  },
};
