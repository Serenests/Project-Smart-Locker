//Smart-locker-API/controllers/SyncController.js
require("dotenv").config();

const e = require("express");
const prisma = require("../lib/prisma");
const { decryptCitizenId } = require("./UserController");

module.exports = {
  SyncController: {
    syncUsers: async (req, res) => {
      const { last_sync } = req.query;
      const lastSyncDate = last_sync ? new Date(last_sync) : new Date(0);

      try {
        const updatedUsers = await prisma.User_locker_grant.findMany({
          where: {
            AND: [
              {
                Locker: {
                  locker_id: req.locker.locker_id,
                },
              },
              {
                OR: [
                  { created_at: { gt: last_sync } },
                  { updated_at: { gt: last_sync } },
                  { deleted_at: { gt: last_sync } },
                  { User: { updated_at: { gt: lastSyncDate } } },
                  { User: { deleted_at: { gt: lastSyncDate } } },
                ],
              },
            ],
          },
          select: {
            permission_withdraw: true,
            permission_restock: true,
            deleted_at: true,
            User: {
              select: {
                user_id: true,
                citizen_id: true,
                email: true,
                first_name: true,
                last_name: true,
                password: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        });

        console.log(
          `[SYNC] Locker ${req.locker.locker_id} synced ${updatedUsers.length} authorized users`,
        );

        const processedUsers = updatedUsers.map((record) => {
          if (record.User && record.User.citizen_id) {
            return {
              ...record,
              User: {
                ...record.User,
                // ส่ง encryptedCitizenId และ userId (ซึ่งมีค่าคงที่) เข้าไป
                citizen_id: decryptCitizenId(
                  record.User.citizen_id,
                  record.User.user_id,
                ),
              },
            };
          }
          return record;
        });

        res.json({
          status: "success",
          server_time: new Date().toISOString(),
          count: processedUsers.length,
          data: processedUsers,
        });
      } catch (error) {
        console.error("Sync Error:", error);
        res.status(500).json({ message: "Failed to sync users" });
      }
    },

    syncProducts: async (req, res) => {
      const { last_sync } = req.query;
      const lastSyncDate = last_sync ? new Date(last_sync) : new Date(0);

      try {
        const updatedProducts = await prisma.Product.findMany({
          where: {
            OR: [
              { created_at: { gt: lastSyncDate } },
              { updated_at: { gt: lastSyncDate } },
              { deleted_at: { gt: lastSyncDate } },
            ],
          },
          select: {
            product_id: true,
            product_name: true,
            product_detail: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        });

        console.log(
          `[SYNC] synced ${updatedProducts.length} products`,
        );

        res.json({
          status: "success",
          server_time: new Date().toISOString(),
          count: updatedProducts.length,
          data: updatedProducts,
        });
      } catch (error) {
        console.error("Sync Error:", error);
        res.status(500).json({ message: "Failed to sync products" });
      }
    },
  },
};
