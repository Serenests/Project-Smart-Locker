// Smart-locker-API/controllers/QrTaskController.js
const prisma = require("../lib/prisma");
const crypto = require("crypto");
const {
  publishQrTaskUpsert,
  publishQrTaskCancel,
} = require("../utils/lockerMqttEvents");

function parseItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((it) => ({
    product_id: it.product_id,
    product_name: it.product_name || null,
    slot_id: Number(it.slot_id),
    amount: Number(it.amount),
    lot_id: it.lot_id || null,
    expired_at: it.expired_at || null,
    slot_stock_id: it.slot_stock_id ? Number(it.slot_stock_id) : null,
  }));
}

module.exports = {
  QrTaskController: {
    createQrTask: async (req, res) => {
      console.log(
        `[${new Date().toISOString()}] createQrTask called`,
        req.body,
      );
      try {
        const { locker_id, task_type, assigned_user_id, expires_at, items } =
          req.body;

        if (
          !locker_id ||
          !task_type ||
          !assigned_user_id ||
          !Array.isArray(items) ||
          items.length === 0
        ) {
          return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
        }
        if (!["restock", "dispense"].includes(task_type)) {
          return res
            .status(400)
            .json({ message: "task_type ต้องเป็น restock หรือ dispense" });
        }

        const taskId = crypto.randomUUID();
        const qrToken = `QR-${taskId}`;

        console.log(
          `[${new Date().toISOString()}] 💾 Inserting QR task to database - task_id: ${taskId}, locker_id: ${locker_id}`,
        );
        const newTask = await prisma.qr_task.create({
          data: {
            task_id: taskId,
            locker_id: Number(locker_id),
            task_type,
            assigned_user_id,
            qr_token: qrToken,
            items_json: parseItems(items),
            status: "pending",
            expires_at: expires_at ? new Date(expires_at) : null,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });

        console.log(
          `[${new Date().toISOString()}] ✅ QR task created in database - task_id: ${newTask.task_id}`,
        );

        try {
          await publishQrTaskUpsert({
            task_id: newTask.task_id,
            locker_id: newTask.locker_id,
            task_type: newTask.task_type,
            assigned_user_id: newTask.assigned_user_id,
            qr_token: newTask.qr_token,
            status: newTask.status,
            updated_at: newTask.updated_at.toISOString(),
            expires_at: newTask.expires_at
              ? newTask.expires_at.toISOString()
              : null,
            used_at: null,
            deleted_at: null,
            items: newTask.items_json,
          });

          return res.status(201).json({
            message: "สร้าง QR task สำเร็จ",
            task: {
              task_id: newTask.task_id,
              qr_token: newTask.qr_token,
              locker_id: newTask.locker_id,
              task_type: newTask.task_type,
              assigned_user_id: newTask.assigned_user_id,
              status: newTask.status,
              expires_at: newTask.expires_at,
              created_at: newTask.created_at,
              items_json: newTask.items_json,
            },
          });
        } catch (error) {
          console.error("Error publishing MQTT QR task upsert:", error);
          // ✅ Still return success since database insert succeeded
          // MQTT is non-critical for the API response
          return res.status(201).json({
            message:
              "สร้าง QR task สำเร็จ (ไม่สามารถส่ง MQTT ได้ แต่ข้อมูลถูกบันทึกแล้ว)",
            task: {
              task_id: newTask.task_id,
              qr_token: newTask.qr_token,
              locker_id: newTask.locker_id,
              task_type: newTask.task_type,
              assigned_user_id: newTask.assigned_user_id,
              status: newTask.status,
              expires_at: newTask.expires_at,
              created_at: newTask.created_at,
              items_json: newTask.items_json,
            },
          });
        }
      } catch (error) {
        console.error("createQrTask error:", error);
        return res
          .status(500)
          .json({ message: "Internal server error", error: error.message });
      }
    },

    cancelQrTask: async (req, res) => {
      try {
        const { task_id } = req.body;
        if (!task_id)
          return res.status(400).json({ message: "กรุณาระบุ task_id" });

        const task = await prisma.qr_task.findUnique({ where: { task_id } });
        if (!task) return res.status(404).json({ message: "ไม่พบ task" });

        if (task.status !== "pending") {
          return res.status(409).json({
            message: `ไม่สามารถยกเลิก task ที่ status เป็น ${task.status}`,
          });
        }

        const updated = await prisma.qr_task.update({
          where: { task_id },
          data: {
            status: "cancelled",
            updated_at: new Date(),
            deleted_at: new Date(),
          },
        });

        await publishQrTaskCancel({
          task_id: updated.task_id,
          locker_id: updated.locker_id,
          task_type: updated.task_type,
          assigned_user_id: updated.assigned_user_id,
        });

        return res
          .status(200)
          .json({ message: "ยกเลิก QR task สำเร็จ", task: updated });
      } catch (error) {
        console.error("cancelQrTask error:", error);
        return res
          .status(500)
          .json({ message: "Internal server error", error: error.message });
      }
    },

    // GET /qrTask/getByLocker/:locker_id
    getQrTasksByLocker: async (req, res) => {
      try {
        const { locker_id } = req.params;
        if (!locker_id)
          return res.status(400).json({ message: "กรุณาระบุ locker_id" });

        const tasks = await prisma.qr_task.findMany({
          where: { locker_id: Number(locker_id), deleted_at: null },
          orderBy: { created_at: "desc" },
        });

        return res.status(200).json({ tasks });
      } catch (error) {
        console.error("getQrTasksByLocker error:", error);
        return res
          .status(500)
          .json({ message: "Internal server error", error: error.message });
      }
    },

    completeFromLocker: async (req, res) => {
      try {
        const {
          task_id,
          locker_id,
          status,
          used_at,
          updated_at,
          completed_by,
        } = req.body || {};

        if (!task_id)
          return res.status(400).json({ message: "task_id is required" });

        const task = await prisma.qr_task.findUnique({ where: { task_id } });
        if (!task)
          return res.status(404).json({ message: "QR task not found" });

        if (locker_id != null && Number(task.locker_id) !== Number(locker_id)) {
          return res.status(409).json({ message: "locker_id mismatch" });
        }

        if (task.status === "completed") {
          return res.status(200).json({
            message: "already completed",
            task_id: task.task_id,
            status: task.status,
          });
        }

        const updated = await prisma.qr_task.update({
          where: { task_id },
          data: {
            status: "completed",
            used_at: used_at ? new Date(used_at) : new Date(),
            updated_at: updated_at ? new Date(updated_at) : new Date(),
          },
        });

        return res.status(200).json({
          message: "QR task updated from locker callback",
          task_id: updated.task_id,
          status: updated.status,
          completed_by: completed_by || null,
        });
      } catch (error) {
        console.error("completeFromLocker error:", error);
        return res
          .status(500)
          .json({ message: "Internal server error", error: error.message });
      }
    },

    // GET /qrTask/getQrTasksByUser
    // ใช้ข้อมูลจาก JWT (req.user) ที่ถูก inject โดย authenticateToken middleware
    // role_id === 1 (System Admin) → เห็นทุก task
    // role_id === 3 (Dept Admin)   → เห็นเฉพาะ task ของ locker ที่อยู่ใน location เดียวกัน
    getQrTasksByUser: async (req, res) => {
      try {
        const user = req.user; // inject โดย authenticateToken middleware
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        // JWT payload: userId, role, locationId, groupLocationId (camelCase)
        const { role, locationId } = user;

        let tasks;

        if (role === 1) {
          // System Admin: ดึงทุก task ที่ยังไม่ถูกลบ
          tasks = await prisma.qr_task.findMany({
            where: { deleted_at: null },
            orderBy: { created_at: "desc" },
          });
        } else {
          // Dept Admin (role 3) หรือ role อื่น: กรองตาม location_id ของ locker
          // หา locker_id ทั้งหมดที่ location_id ตรงกัน
          const lockers = await prisma.locker.findMany({
            where: {
              location_id: Number(locationId),
              deleted_at: null,
            },
            select: { locker_id: true },
          });

          const lockerIds = lockers.map((l) => l.locker_id);

          tasks = await prisma.qr_task.findMany({
            where: {
              locker_id: { in: lockerIds.length > 0 ? lockerIds : [-1] },
              deleted_at: null,
            },
            orderBy: { created_at: "desc" },
          });
        }

        return res.status(200).json({ tasks });
      } catch (error) {
        console.error("getQrTasksByUser error:", error);
        return res
          .status(500)
          .json({ message: "Internal server error", error: error.message });
      }
    },
  },
};
