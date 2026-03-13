// SmartLocker-API/controllers/LockerProvisionController.js
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { get } = require("http");
require("dotenv").config();

function generateProvisionCodeCrypto(length) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex") // แปลงเป็น hexadecimal format
    .slice(0, length) // ตัดให้ได้ความยาวที่ต้องการ
    .toUpperCase(); // เปลี่ยนเป็นตัวพิมพ์ใหญ่
}

const prisma = require("../lib/prisma");

async function generateUniqueProvisionCode() {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateProvisionCodeCrypto(6);

    // เช็คว่ามีอยู่แล้วหรือไม่
    const existing = await prisma.locker_Provision.findUnique({
      where: { provision_code: code },
    });

    if (!existing) {
      return code; // ถ้าไม่ซ้ำให้ return
    }
  }

  throw new Error("Unable to generate unique provision code");
}

module.exports = {
  LockerProvisionController: {
    createProvision: async (req, res) => {
      const { locker_id, provision_code, expires_at } = req.body;

      try {
        const provision = await prisma.locker_Provision.create({
          data: {
            locker_id,
            provision_code:
              provision_code || (await generateUniqueProvisionCode()),
            expires_at,
          },
        });
        res.status(201).json(provision);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    },

    // Change to getAllProvisions with search functionality
    getAllProvisions: async (req, res) => {
      try {
        const { search } = req.query;
        let whereCondition = {};
        if (search) {
          console.log("Search query:", search);
          whereCondition = {
            OR: [
              { provision_id: { contains: search, mode: "insensitive" } },
              { locker_id: { contains: search, mode: "insensitive" } },
              {
                Locker: {
                  Location: {
                    location_name: { contains: search, mode: "insensitive" },
                  },
                },
              },
              {
                Locker: {
                  locker_location_detail: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              { provision_code: { contains: search, mode: "insensitive" } },
            ],
          };
        }

        const provisions = await prisma.locker_Provision.findMany({
          where: whereCondition,
          select: {
            provision_id: true,
            locker_id: true,
            Locker: {
              select: {
                Location: {
                  select: {
                    location_name: true,
                  },
                },
                locker_location_detail: true,
              },
            },
            provision_code: true,
            is_activated: true,
          },
          orderBy: {
            created_at: "asc",
          },
        });

        res.status(200).json({
          message: "ดึงข้อมูลการจัดสรรล็อกเกอร์สำเร็จ",
          provisions: provisions,
        });

        const formattedProvisions = provisions.map((provision) => ({
          provision_id: provision.provision_id,
          locker_id: provision.locker_id,
          location_name: provision.Locker.Location.location_name,
          locker_location_detail: provision.Locker.locker_location_detail,
          provision_code: provision.provision_code,
          is_activated: provision.is_activated,
        }));

        console.log("Formatted Provisions:", formattedProvisions);
      } catch (error) {
        console.error("Get all provisions error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    updateProvision: async (req, res) => {
      const { provision_id } = req.body;
      const { expires_at } = req.body;

      try {
        const provision = await prisma.locker_Provision.update({
          where: { provision_id: parseInt(provision_id) },
          data: {
            expires_at,
            updated_at: new Date(),
          },
        });
        res.status(200).json({
          message: "อัปเดตการจัดสรรล็อกเกอร์สำเร็จ",
        });
        res.json(provision);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    },

    deleteProvision: async (req, res) => {
      const { provision_id } = req.body;

      try {
        await prisma.locker_Provision.delete({
          where: { provision_id: parseInt(provision_id) },
        });

        await prisma.locker.updateMany({
          where: { locker_id: provision_id.locker_id },
          data: { api_token: null, locker_status: false },
        });

        await prisma.user_locker_grant.deleteMany({
          where: { locker_id: provision_id.locker_id },
        });

        await prisma.transaction.deleteMany({
          where: { locker_id: provision_id.locker_id },
        });

        await prisma.transaction_detail.deleteMany({
          where: { locker_id: provision_id.locker_id },
        });

        await prisma.slot_stock.deleteMany({
          //ลบข้อมูลในตาราง slot_stock ที่ slot_stock_id ตรงกับ slot_id ของ locker_id ที่ถูกลบ
          where: { locker_id: provision_id.locker_id },
        });


        res.status(200).json({
          message: "ลบการจัดสรรล็อกเกอร์สำเร็จ",
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    },

    //get locker by provision code
    getLockerProvisionByCode: async (req, res) => {
      const { provision_code } = req.params;

      try {
        const provision = await prisma.locker_Provision.findUnique({
          where: { provision_code },
          select: {
            locker_id: true,
            Locker: {
              select: {
                location_id: true,
                locker_location_detail: true,
              },
            },
          },
        });

        if (!provision) {
          return res.status(404).json({ message: "ไม่พบการจัดสรรล็อกเกอร์" });
        }

        //if provision is_activated = true return error
        if (provision.is_activated) {
          return res
            .status(400)
            .json({ message: "รหัสการจัดสรรล็อกเกอร์นี้ถูกใช้งานแล้ว" });
        }

        //set is_active to true
        await prisma.locker_Provision.update({
          where: { provision_code },
          data: { is_activated: true },
        });

        const apiToken = crypto.randomBytes(32).toString("hex");
        const hashedApiToken = await bcrypt.hash(apiToken, 10);

        await prisma.locker.update({
          where: { locker_id: provision.locker_id},
          data: { api_token: hashedApiToken,
              locker_status: true
           },
        });

        //return value of locker_id and provision_code

        res.status(200).json({
          message: "ดึงข้อมูลการจัดสรรล็อกเกอร์สำเร็จ",
          data: {
            locker_id: provision.locker_id,
            locker_location_detail: provision.Locker.locker_location_detail,
            api_token: apiToken,
          },
        });
      } catch (error) {
        console.error("Get provision error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },
  },
};
