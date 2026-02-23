//Smart-locker-API/controllers/LocationController.js
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
require("dotenv").config();

const prisma = require("../lib/prisma");
const { server } = require("typescript");

module.exports = {
  LockerController: {
    createLocker: async (req, res) => {
      try {
        console.log("createLocker request body:", req.body);

        const { location_id, locker_location_detail } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!location_id || !locker_location_detail) {
          return res.status(400).json({
            message: "กรุณากรอกข้อมูลให้ครบถ้วน",
          });
        }

        //คอลลั่มต้องตรงกับใน schema.prisma
        const newLocker = await prisma.Locker.create({
          data: {
            location_id: location_id,
            locker_location_detail: locker_location_detail,
            created_at: new Date(),
            updated_at: null,
            deleted_at: null,
          },
        });

        res.status(201).json({
          message: "สร้าง Locker สำเร็จ",
          Locker: newLocker,
        });
      } catch (error) {
        console.error("Create Locker error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    deleteLocker: async (req, res) => {
      try {
        const { locker_id } = req.body;

        if (!locker_id) {
          return res.status(400).json({
            message: "กรุณาระบุ location_id",
          });
        }

        // ตรวจสอบว่าสถานที่มีอยู่ในระบบหรือไม่
        const existingLocker = await prisma.Locker.findUnique({
          where: {
            locker_id: locker_id,
          },
        });

        if (!existingLocker) {
          return res.status(404).json({
            message: "ไม่พบ Locker ในระบบ",
          });
        }

        // ลบกลุ่มสถานที่
        await prisma.Locker.delete({
          where: {
            locker_id: locker_id,
          },
        });

        res.status(200).json({
          message: "ลบ Locker สำเร็จ",
        });
      } catch (error) {
        console.error("Delete Locker error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    //Edit Locker
    editLocker: async (req, res) => {
      try {
        // รับค่าจาก body
        const { locker_id, locker_location_detail } = req.body;

        // ตรวจสอบว่ามี locker_id หรือไม่
        if (!locker_id) {
          return res.status(400).json({
            message: "กรุณาระบุ location_id",
          });
        }

        // ตรวจสอบว่ามี Locker มีอยู่ในระบบหรือไม่
        const existingLocker = await prisma.Locker.findUnique({
          where: {
            locker_id: locker_id,
          },
        });

        if (!existingLocker) {
          return res.status(404).json({
            message: "ไม่พบ Locker ในระบบ",
          });
        }

        // สร้าง object สำหรับ update เฉพาะฟิลด์ที่ส่งมา
        const updateData = {};
        if (locker_location_detail)
          updateData.locker_location_detail = locker_location_detail;

        // อัพเดทเวลาที่แก้ไข
        updateData.updated_at = new Date();

        // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
        if (Object.keys(updateData).length === 1) {
          // มีแค่ updated_at
          return res.status(400).json({
            message: "กรุณาระบุข้อมูลที่ต้องการแก้ไข",
          });
        }

        // อัพเดทข้อมูลล็อกเกอร์
        const updatedLocker = await prisma.Locker.update({
          where: {
            locker_id: locker_id,
          },
          data: updateData,
        });

        res.status(200).json({
          message: "แก้ไข Locker สำเร็จ",
          Locker: updatedLocker,
        });
      } catch (error) {
        console.error("Edit Locker error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    getAllLockers: async (req, res) => {
      try {
        const lockers = await prisma.Locker.findMany({
          include: {
            Location: true,
          },
          orderBy: {
            created_at: "desc",
          },
        });

        res.status(200).json({
          message: "ดึงข้อมูลล็อกเกอร์สำเร็จ",
          lockers: lockers,
        });
      } catch (error) {
        console.error("Get all lockers error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    getLockersByLocationId: async (req, res) => {
      try {
        const { location_id } = req.params;

        const lockers = await prisma.Locker.findMany({
          where: {
            location_id: parseInt(location_id),
          },
          include: {
            Location: {
              select: {
                location_id: true,
                location_name: true,
                group_location_id: true,
              },
            },
          },
        });

        res.status(200).json({
          message: "ดึงข้อมูลล็อกเกอร์ตาม location_id สำเร็จ",
          lockers: lockers,
        });
      } catch (error) {
        console.error("Get lockers by location_id error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    getLockerByGroupLocationId: async (req, res) => {
      try {
        const { group_location_id } = req.query;

        const lockers = await prisma.Locker.findMany({
          where: {
            deleted_at: null,
            Location: {
              group_location_id: parseInt(group_location_id),
            },
          },
          include: {
            Location: {
              select: {
                location_id: true,
                location_name: true,
                group_location_id: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        });

        res.status(200).json({
          message: "ดึงข้อมูลล็อกเกอร์ตาม group_location_id สำเร็จ",
          lockers: lockers,
        });
      } catch (error) {
        console.error("Get lockers by group_location_id error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    getActivatedLockersByLocationId: async (req, res) => {
      try {
        const { location_id } = req.params;

        const lockers = await prisma.Locker.findMany({
          where: {
            location_id: parseInt(location_id),
            deleted_at: null,
            // ✅ ต้องมี Locker_Provision และ is_activated = true
            Locker_Provision: {
              is_activated: true,
            },
          },
          include: {
            Location: {
              select: {
                location_id: true,
                location_name: true,
                group_location_id: true,
              },
            },
            Locker_Provision: {
              select: {
                provision_id: true,
                provision_code: true,
                is_activated: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        });

        console.log(
          `✅ Found ${lockers.length} activated lockers for location_id: ${location_id}`,
        );

        res.status(200).json({
          message: "ดึงข้อมูลล็อกเกอร์ที่ activated สำเร็จ",
          lockers: lockers,
        });
      } catch (error) {
        console.error("Get activated lockers error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    getLockerDontHaveProvision: async (req, res) => {
      try {
        const lockers = await prisma.Locker.findMany({
          where: {
            Locker_Provision: null,
            deleted_at: null,
          },
        });

        res.status(200).json({
          message: "ดึงข้อมูลล็อกเกอร์ที่ไม่มีการจัดสรรสำเร็จ",
          lockers: lockers,
        });
      } catch (error) {
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    verifyLocker: async (req, res, next) => {
      const { locker_id, api_token } = req.headers;

      if (!locker_id || !api_token) {
        return res
          .status(401)
          .json({ message: "Missing locker_id or api_token in headers" });
      }

      const tokenParts = api_token.split(" ");

      if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
        return res
          .status(401)
          .json({ message: "Invalid Authorization format" });
      }

      const apiToken = tokenParts[1];
      try {
        const locker = await prisma.Locker.findUnique({
          where: { locker_id: parseInt(locker_id) },
          select: {
            locker_id: true,
            api_token: true,
            locker_status: true,
          },
        });

        if (!locker || !locker.api_token) {
          return res
            .status(403)
            .json({ message: "Locker or API token not found" });
        }

        const isMatch = await bcrypt.compare(apiToken, locker.api_token);
        if (!isMatch) {
          return res.status(401).json({ message: "Invalid API Token" });
        }

        if (!locker.locker_status) {
          console.log("[AUTH] Access denied for revoked locker:", locker_id);
          return res.status(403).json({
            error_code: "DEVICE_REVOKED",
            message:
              "This locker has been deactivated. Please contact support.",
          });
        }

        req.locker = locker;
        next();
      } catch (error) {
        console.error("Error verifying locker:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },

    lockerHeartbeat: async (req, res) => {
      const now = new Date();
      req.locker.last_seen = now;

      console.log(
        `[HEARTBEAT] Locker ${req.locker.locker_id} is online at ${now.toISOString()}`,
      );

      res.json({
        status: "ok",
        message: "Heartbeat received",
        server_time: now.toISOString(),
      });
    },
  },
};
