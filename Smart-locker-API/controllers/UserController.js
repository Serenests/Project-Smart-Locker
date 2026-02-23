//Smart-locker-API/controllers/UserController.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { canManageUser, canCreateUserWithRole, getUserFilterScope } = require('../utils/permissionHelper');
require('dotenv').config();

const prisma = require('../lib/prisma');

const hashCitizenId = (citizenId) => {
  if (!citizenId) return null;
  // ใช้ SHA256 เพื่อสร้าง Fingerprint ที่คงที่สำหรับค้นหา (ย้อนกลับไม่ได้)
  return crypto
    .createHmac("sha256", process.env.ENCRYPTION_KEY)
    .update(citizenId)
    .digest("hex");
};

const encryptCitizenId = (citizenId, userId) => {
  if (!citizenId || !userId) return null;
  const algorithm = "aes-256-cbc";
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, "salt", 32);

  // ใช้ userId แทนเพื่อให้ตอนถอดรหัส เรามี "กุญแจ" ในการสร้าง IV เดิมกลับมา
  const iv = crypto
    .createHash("md5")
    .update(userId + process.env.ENCRYPTION_KEY)
    .digest();

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(citizenId, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

const decryptCitizenId = (encryptedCitizenId, userId) => {
  try {
    if (!encryptedCitizenId || !userId) return null;
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, "salt", 32);

    // สร้าง IV เดิมกลับมาโดยใช้ userId (ซึ่งเราดึงมาจาก DB ได้พร้อมกับข้อมูลที่เข้ารหัส)
    const iv = crypto
      .createHash("md5")
      .update(userId + process.env.ENCRYPTION_KEY)
      .digest();

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedCitizenId, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    return null;
  }
};

const maskCitizenId = (citizenId) => {
    if (!citizenId) return null;
    
    // ถ้าเป็น encrypted data (hex string) ให้แสดงแค่บางส่วน
    if (citizenId.length > 13) {
        return `${citizenId.substring(0, 8)}...${citizenId.substring(citizenId.length - 4)}`;
    }
    
    // ถ้าเป็นเลขบัตรปกติ 13 หลัก
    if (citizenId.length === 13) {
        return `${citizenId.substring(0, 4)}*****${citizenId.substring(11)}`;
    }
    
    return citizenId;
};


module.exports = {
  UserController: {
    signIn: async (req, res) => {
      try {
        console.log("Request body:", req.body);

        const { identifier, password } = req.body;

        if (!identifier || !password) {
          return res.status(400).json({
            message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน",
            token: null,
          });
        }

        let searchConditions = [
          { email: identifier },
          { card_uid: identifier },
        ];

        // เข้ารหัส identifier ก่อนค้นหา (ถ้าเป็นตัวเลข 13 หลัก = citizen_id)
        if (/^\d{13}$/.test(identifier)) {
          const citizenHash = hashCitizenId(identifier);
          searchConditions.push({ citizen_id_search: citizenHash });
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: searchConditions,
          },
          select: {
            user_id: true,
            email: true,
            password: true,
            first_name: true,
            last_name: true,
            role_id: true,
            location_id: true,
            group_location_id: true,
            // ดึงชื่อ location และ group_location ด้วย
            Location: {
              select: {
                location_name: true,
              },
            },
            Group_Location: {
              select: {
                group_location_name: true,
              },
            },
          },
        });

        if (!user) {
          return res.status(401).json({
            message: "ไม่พบผู้ใช้ในระบบ",
            token: null,
          });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          return res.status(401).json({
            message: "รหัสผ่านไม่ถูกต้อง",
            token: null,
          });
        }

        const token = jwt.sign(
          {
            userId: user.user_id,
            role: user.role_id,
            email: user.email,
            groupLocationId: user.group_location_id, // ✅ เพิ่ม
            locationId: user.location_id, // ✅ เพิ่ม
          },
          process.env.JWT_SECRET,
          { expiresIn: "24h" },
        );

        res.status(200).json({
          message: "เข้าสู่ระบบสำเร็จ",
          token: token,
          user: {
            id: user.user_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role_id,
            groupLocationId: user.group_location_id,
            locationId: user.location_id,
            locationName: user.Location?.location_name || null,
            groupLocationName: user.Group_Location?.group_location_name || null,
          },
        });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
          token: null,
        });
      }
    },

    register: async (req, res) => {
      try {
        console.log("Register request body:", req.body);

        const {
          citizen_id,
          card_uid,
          first_name,
          last_name,
          date_of_birth,
          religion,
          gender,
          email,
          password,
          phone_number,
          location_id,
          group_location_id,
          role_id,
        } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (
          !first_name ||
          !last_name ||
          !email ||
          !password ||
          !role_id ||
          !citizen_id
        ) {
          console.log("❌ Validation failed: Missing required fields");
          return res.status(400).json({
            message:
              "กรุณากรอกข้อมูลที่จำเป็น (ชื่อ, นามสกุล, อีเมล, รหัสผ่าน, เลขบัตรประชาชน)",
          });
        }

        const citizenHash = hashCitizenId(citizen_id);

        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: email },
              { citizen_id_search: citizenHash }, // ค้นหาผ่าน Hash (รวดเร็วมาก)
              card_uid ? { card_uid: card_uid } : {},
            ].filter((obj) => Object.keys(obj).length > 0),
          },
        });

        if (existingUser) {
          return res.status(409).json({
            message: "อีเมล, เลขบัตรประชาชน หรือ Card UID นี้ถูกใช้งานแล้ว",
          });
        }

        // เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 10);

        // สร้างผู้ใช้ใหม่
        const newUser = await prisma.user.create({
          data: {
            citizen_id: "PENDING", // สถานะชั่วคราว รอการเข้ารหัสจริงหลังได้ user_id
            card_uid: card_uid || null,
            citizen_id_search: citizenHash, // เก็บ Hash สำหรับค้นหา
            first_name,
            last_name,
            date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
            religion: religion || null,
            gender: gender || null,
            email,
            password: hashedPassword,
            phone_number: phone_number || null,
            location_id: parseInt(location_id) || null,
            group_location_id: parseInt(group_location_id) || null,
            role_id: parseInt(role_id),
            created_at: new Date(),
            updated_at: null,
          },
        });

        const encryptedValue = encryptCitizenId(citizen_id, newUser.user_id);

        await prisma.user.update({
          where: { user_id: newUser.user_id },
          data: { citizen_id: encryptedValue },
        });

        // สร้าง JWT token
        const token = jwt.sign(
          {
            userId: newUser.user_id,
            role: newUser.role_id,
            email: newUser.email,
          },
          process.env.JWT_SECRET,
          { expiresIn: "24h" },
        );

        res.status(201).json({
          message: "ลงทะเบียนสำเร็จ",
          token: token,
          user: {
            id: newUser.user_id,
            email: newUser.email,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            role: newUser.role_id,
          },
        });
      } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    deleteUser: async (req, res) => {
      try {
        const { user_id } = req.body;

        // ✅ ดึงข้อมูล requester
        const requester = req.user;

        if (!user_id) {
          return res.status(400).json({
            message: "กรุณากรอก user_id",
          });
        }

        // ✅ ดึงข้อมูล target user
        const targetUser = await prisma.user.findUnique({
          where: { user_id: user_id },
        });

        if (!targetUser) {
          return res.status(404).json({
            message: "ไม่พบผู้ใช้ในระบบ",
          });
        }

        // ✅ ป้องกันการลบตัวเอง
        if (requester.userId === user_id) {
          return res.status(403).json({
            message: "คุณไม่สามารถลบบัญชีของตัวเองได้",
          });
        }

        // ✅ ตรวจสอบ permission
        const permission = canManageUser(requester, targetUser);
        if (!permission.allowed) {
          console.log("❌ Permission denied:", permission.reason);
          return res.status(403).json({
            message: permission.reason,
          });
        }

        // soft delete by setting deleted_at
        await prisma.user.update({
          where: { user_id: user_id },
          data: { deleted_at: new Date() },
        });

        await prisma.user_locker_grant.deleteMany({
          where: { user_id: user_id },
        });

        res.status(200).json({
          message: "ลบผู้ใช้สำเร็จ",
        });
      } catch (error) {
        //dont find user_id
        console.error("Delete user error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    //Edit User ข้อมูลผู้ใช้มีอะไรบ้างที่สามารถแก้ไขได้
    editUser: async (req, res) => {
      try {
        // รับค่าจาก body
        const {
          user_id,
          location_id,
          group_location_id,
          first_name,
          last_name,
          religion,
          gender,
          password,
          phone_number,
          role_id,
        } = req.body;

        // ✅ ดึงข้อมูล requester
        const requester = req.user;

        // ตรวจสอบว่ามี user_id หรือไม่
        if (!user_id) {
          return res.status(400).json({
            message: "กรุณาระบุ user_id",
          });
        }

        // ✅ ดึงข้อมูล target user
        const targetUser = await prisma.user.findUnique({
          where: { user_id: user_id },
        });

        if (!targetUser) {
          return res.status(404).json({
            message: "ไม่พบผู้ใช้ในระบบ",
          });
        }

        // ✅ ตรวจสอบ permission
        const permission = canManageUser(requester, targetUser);
        if (!permission.allowed) {
          console.log("❌ Permission denied:", permission.reason);
          return res.status(403).json({
            message: permission.reason,
          });
        }

        // ✅ ถ้ามีการเปลี่ยน role ต้องตรวจสอบว่ามีสิทธิ์สร้าง role นั้นหรือไม่
        if (role_id && role_id !== targetUser.role_id) {
          const canCreate = canCreateUserWithRole(requester, role_id);
          if (!canCreate.allowed) {
            return res.status(403).json({
              message: canCreate.reason,
            });
          }
        }

        // สร้าง object สำหรับ update เฉพาะฟิลด์ที่ส่งมา
        const updateData = {};

        if (location_id !== undefined) updateData.location_id = location_id;
        if (group_location_id !== undefined)
          updateData.group_location_id = group_location_id;
        if (first_name !== undefined) updateData.first_name = first_name;
        if (last_name !== undefined) updateData.last_name = last_name;
        if (religion !== undefined) updateData.religion = religion;
        if (gender !== undefined) updateData.gender = gender;
        if (phone_number !== undefined) updateData.phone_number = phone_number;
        if (role_id !== undefined) updateData.role_id = role_id;

        // ถ้ามีการเปลี่ยนรหัสผ่าน ให้เข้ารหัสก่อน
        if (password) {
          updateData.password = await bcrypt.hash(password, 10);
        }

        // อัพเดทเวลาที่แก้ไข
        updateData.updated_at = new Date();

        // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
        if (Object.keys(updateData).length === 1) {
          // มีแค่ updated_at
          return res.status(400).json({
            message: "กรุณาระบุข้อมูลที่ต้องการแก้ไข",
          });
        }

        // อัพเดทข้อมูลผู้ใช้
        const updatedUser = await prisma.user.update({
          where: {
            user_id: user_id,
          },
          data: updateData,
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            gender: true,
            religion: true,
            role_id: true,
            location_id: true,
            group_location_id: true,
            updated_at: true,
          },
        });

        res.status(200).json({
          message: "แก้ไขข้อมูลผู้ใช้สำเร็จ",
          user: updatedUser,
        });
      } catch (error) {
        console.error("Edit user error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    getAllUsers: async (req, res) => {
      try {
        const { search } = req.query;

        // ✅ ดึงข้อมูล requester จาก token
        const requester = req.user; // จาก authenticateToken middleware

        console.log("🔍 Fetching users for:", {
          userId: requester.userId,
          role: requester.role,
          groupLocationId: requester.groupLocationId,
          locationId: requester.locationId,
        });

        // ✅ สร้าง filter scope ตาม role
        const scopeFilter = getUserFilterScope(requester);
        console.log("📋 Scope filter:", scopeFilter);

        let whereCondition = { ...scopeFilter };

        if (search) {
          console.log("Search term:", search);
          whereCondition = {
            OR: [
              { first_name: { contains: search, mode: "insensitive" } },
              { last_name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { card_uid: { contains: search, mode: "insensitive" } },
            ],
            AND: [
              { deleted_at: null }, // ไม่แสดงผู้ใช้ที่ถูกลบ
            ],
          };
        }

        // ดึงข้อมูลผู้ใช้ทั้งหมด พร้อม relation
        const users = await prisma.user.findMany({
          where: whereCondition,
          select: {
            user_id: true,
            citizen_id: true,
            card_uid: true,
            first_name: true,
            last_name: true,
            date_of_birth: true,
            religion: true,
            gender: true,
            email: true,
            phone_number: true,
            role_id: true,
            location_id: true,
            group_location_id: true,
            created_at: true,
            updated_at: true,
            // ดึงข้อมูล relation (ถ้ามี)
            Role: {
              select: {
                role_name: true,
              },
            },
            Location: {
              select: {
                location_name: true,
              },
            },
            Group_Location: {
              select: {
                group_location_name: true,
              },
            },
          },
          orderBy: {
            created_at: "asc",
          },
        });

        console.log(`✅ Found ${users.length} users (filtered by scope)`);

        // จัดรูปแบบข้อมูลก่อนส่งกลับ
        const formattedUsers = users.map((user) => ({
          user_id: user.user_id,
          citizen_id: user.citizen_id ? maskCitizenId(user.citizen_id) : null,
          card_uid: user.card_uid,
          first_name: user.first_name,
          last_name: user.last_name,
          date_of_birth: user.date_of_birth,
          religion: user.religion,
          gender: user.gender,
          email: user.email,
          phone_number: user.phone_number,
          role_id: user.role_id,
          role: user.Role?.role_name || "ไม่ระบุ", // ✅ ใช้ Role ตัวใหญ่
          location_id: user.location_id,
          location_name: user.Location?.location_name || null, // ✅ ใช้ Location ตัวใหญ่
          group_location_id: user.group_location_id,
          group_name: user.Group_Location?.group_location_name || null, // ✅ ใช้ Group_Location และ field ที่ถูกต้อง
          created_at: user.created_at,
          updated_at: user.updated_at,
        }));

        res.status(200).json({
          message: "ดึงข้อมูลผู้ใช้สำเร็จ",
          count: formattedUsers.length,
          users: formattedUsers,
          //ส่งข้อมูล requester กลับไปด้วย (สำหรับ UI)
          requester: {
            role: requester.role,
            groupLocationId: requester.groupLocationId,
            locationId: requester.locationId,
          },
        });
      } catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
          users: [],
        });
      }
    },
  },
  decryptCitizenId,
};