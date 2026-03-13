//Smart-locker-API/controllers/TransactionController.js
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { get } = require('http');
const { create } = require('domain');
require('dotenv').config();

const prisma = require('../lib/prisma');



module.exports = {
  TransactionController: {
    createTransaction: async (req, res) => {
      try {
        console.log("createTransaction request body:", req.body);

        const { user_id, activity, status } = req.body;

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!user_id || !activity || !status) {
          return res.status(400).json({
            message: "กรุณากรอกข้อมูลให้ครบถ้วน",
          });
        }

        // สร้างธุรกรรมใหม่
        const newTransaction = await prisma.transaction.create({
          data: {
            user_id: user_id,
            activity: activity,
            status: status,
            created_at: new Date(),
            updated_at: null,
            deleted_at: null,
          },
        });

        res.status(201).json({
          message: "สร้างธุรกรรมสำเร็จ",
          transaction: {
            transaction_id: newTransaction.transaction_id,
            user_id: newTransaction.user_id,
            activity: newTransaction.activity,
            status: newTransaction.status,
            created_at: newTransaction.created_at,
          },
        });
      } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    //ลบ Transaction
    deleteTransaction: async (req, res) => {
      try {

        const { transaction_id } = req.body;

        if (!transaction_id) {
          return res.status(400).json({
            message: "กรุณาระบุ transaction_id",
          });
        }
        await prisma.$transaction(async (tx) => {
          // 1 ลบ Snapshot ก่อน
          await tx.snapshot.deleteMany({
            where: {
              transaction_id: transaction_id,
            },
          });

          // 2 ลบ Transaction Detail
          await tx.transaction_detail.deleteMany({
            where: {
              transaction_id: transaction_id,
            },
          });

          // 3 ลบ Slot Stock ที่เกี่ยวข้อง
          await tx.slot_stock.deleteMany({
            where: {
              Transaction_detail: {
                none: {}, // หรือ logic ตามที่ต้องการ
              },
            },
          });

          // 4 ลบ Transaction
          await tx.transaction.delete({
            where: {
              transaction_id: transaction_id,
            },
          });
        });

        return res.status(200).json({
          message: "ลบธุรกรรมสำเร็จ"
        });

      } catch (error) {

        console.error(error);

        return res.status(500).json({
          message: "เกิดข้อผิดพลาด",
          error: error.message
        });

      }
    },

    editTransaction: async (req, res) => {
      try {
        // รับค่าจาก body
        const { transaction_id, user_id, activity, status } = req.body;

        // ตรวจสอบว่ามี transaction_id หรือไม่
        if (!transaction_id) {
          return res.status(400).json({
            message: "กรุณาระบุ transaction_id",
          });
        }

        // ตรวจสอบว่ามี Transaction มีอยู่ในระบบหรือไม่
        const existingTransaction = await prisma.transaction.findUnique({
          where: {
            transaction_id: transaction_id,
          },
        });

        if (!existingTransaction) {
          return res.status(404).json({
            message: "ไม่พบธุรกรรมในระบบ",
          });
        }

        // สร้าง object สำหรับ update เฉพาะฟิลด์ที่ส่งมา
        const updateData = {};
        if (user_id) updateData.user_id = user_id;
        if (activity) updateData.activity = activity;
        if (status) updateData.status = status;

        // อัพเดทเวลาที่แก้ไข
        updateData.updated_at = new Date();

        // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
        if (Object.keys(updateData).length === 1) {
          // มีแค่ updated_at
          return res.status(400).json({
            message: "กรุณาระบุข้อมูลที่ต้องการแก้ไข",
          });
        }

        // อัพเดทข้อมูล transaction
        const updatedTransaction = await prisma.transaction.update({
          where: { transaction_id: transaction_id },
          data: updateData,
        });

        res.status(200).json({
          message: "แก้ไขข้อมูลธุรกรรมสำเร็จ",
          user: updatedTransaction,
        });
      } catch (error) {
        console.error("Edit transaction error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    getAllTransactions: async (req, res) => {
      try {
        const { search } = req.query;

        let whereCondition = {};
        if (search) {
          console.log("Search query:", search);
          whereCondition = {
            OR: [
              !isNaN(search) && { transaction_id: parseInt(search) },
              { user_id: { contains: search, mode: "insensitive" } },
              { activity: { contains: search, mode: "insensitive" } },
              { status: { contains: search, mode: "insensitive" } },
            ].filter(Boolean),
          };
        }

        const transactions = await prisma.transaction.findMany({
          where: whereCondition,
          include: {
            User: {
              select: {
                first_name: true,
                last_name: true,
              },
            },
            Transaction_detail: {
              select: {
                amount: true,
                slot_id: true,
                Slot_stock: {
                  select: {
                    lot_id: true,
                    amount: true,
                    Product: {
                      select: {
                        product_id: true,
                        product_name: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            created_at: "asc",
          },
        });

        //Format เสร็จแล้วค่อยส่ง
        const formattedTransactions = transactions.map((transaction) => ({
          transaction_id: transaction.transaction_id,
          user_id: transaction.user_id,
          first_name: transaction.User?.first_name || "ไม่ระบุ",
          last_name: transaction.User?.last_name || "ไม่ระบุ",
          activity: transaction.activity,
          status: transaction.status,
          created_at: transaction.created_at,
          User: transaction.User,
          items: transaction.Transaction_detail.map((detail) => ({
            product_id: detail.Slot_stock?.Product?.product_id || "ไม่ระบุ",
            product_name: detail.Slot_stock?.Product?.product_name || "ไม่ระบุ",
            lot_id: detail.Slot_stock?.lot_id || "ไม่ระบุ",
            slot_id: detail.slot_id,
            amount: detail.amount,
            current_stock: detail.Slot_stock?.amount || 0,
          })),
        }));

        // ✅ ส่ง formattedTransactions แทน
        res.status(200).json({
          message: "ดึงข้อมูลธุรกรรมสำเร็จ",
          transactions: formattedTransactions, // ✅ ส่งข้อมูลที่ format แล้ว
        });
      } catch (error) {
        console.error("Get all transactions error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาด",
          error: error.message,
        });
      }
    },

    getTransactionById: async (req, res) => {
      try {
        const { transaction_id } = req.params;

        if (!transaction_id) {
          return res.status(400).json({
            message: "กรุณาระบุ transaction_id",
          });
        }

        const transaction = await prisma.transaction.findMany({
          where: {
            transaction_id: parseInt(transaction_id),
          },
          include: {
            User: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone_number: true,
                role_id: true,
                Group_Location: {
                  select: {
                    group_location_name: true,
                  },
                },
                Location: {
                  select: {
                    location_name: true,
                  },
                },
                Role: {
                  select: {
                    role_name: true,
                  },
                },
              },
            },
          },
        });

        if (!transaction) {
          return res.status(404).json({
            message: "ไม่พบธุรกรรม",
          });
        }

        res.status(200).json(transaction);
      } catch (error) {
        console.error("Get transaction by id error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    // ✅ สำหรับ Role 2: ดึง Transaction ตาม group_location_id
    getTransactionsByGroup: async (req, res) => {
      try {
        const { group_location_id, search } = req.query;

        if (!group_location_id) {
          return res.status(400).json({
            message: "กรุณาระบุ group_location_id",
          });
        }

        console.log(
          "🔍 Fetching transactions for group_location_id:",
          group_location_id,
        );

        let whereCondition = {
          User: {
            group_location_id: parseInt(group_location_id),
          },
        };

        // เพิ่มเงื่อนไขการค้นหา
        if (search) {
          whereCondition = {
            User: {
              group_location_id: parseInt(group_location_id),
            },
            OR: [
              { activity: { contains: search, mode: "insensitive" } },
              { status: { contains: search, mode: "insensitive" } },
            ],
          };
        }

        const transactions = await prisma.transaction.findMany({
          where: whereCondition,
          include: {
            User: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                role_id: true,
                group_location_id: true,
                location_id: true,
                Group_Location: {
                  select: {
                    group_location_id: true,
                    group_location_name: true,
                  },
                },
                Location: {
                  select: {
                    location_id: true,
                    location_name: true,
                  },
                },
                Role: {
                  select: {
                    role_id: true,
                    role_name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        });

        console.log(
          `✅ Found ${transactions.length} transactions for group_location_id: ${group_location_id}`,
        );

        res.status(200).json({
          message: "ดึงข้อมูลธุรกรรมสำเร็จ",
          transactions: transactions,
        });
      } catch (error) {
        console.error("Get transactions by group error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    // ✅ สำหรับ Role 3: ดึง Transaction ตาม location_id
    getTransactionsByLocation: async (req, res) => {
      try {
        const { location_id, search } = req.query;

        if (!location_id) {
          return res.status(400).json({
            message: "กรุณาระบุ location_id",
          });
        }

        console.log("🔍 Fetching transactions for location_id:", location_id);

        let whereCondition = {
          User: {
            location_id: parseInt(location_id),
          },
        };

        // เพิ่มเงื่อนไขการค้นหา
        if (search) {
          whereCondition = {
            User: {
              location_id: parseInt(location_id),
            },
            OR: [
              { activity: { contains: search, mode: "insensitive" } },
              { status: { contains: search, mode: "insensitive" } },
            ],
          };
        }

        const transactions = await prisma.transaction.findMany({
          where: whereCondition,
          include: {
            User: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                role_id: true,
                group_location_id: true,
                location_id: true,
                Group_Location: {
                  select: {
                    group_location_id: true,
                    group_location_name: true,
                  },
                },
                Location: {
                  select: {
                    location_id: true,
                    location_name: true,
                  },
                },
                Role: {
                  select: {
                    role_id: true,
                    role_name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        });

        console.log(
          `✅ Found ${transactions.length} transactions for location_id: ${location_id}`,
        );

        res.status(200).json({
          message: "ดึงข้อมูลธุรกรรมสำเร็จ",
          transactions: transactions,
        });
      } catch (error) {
        console.error("Get transactions by location error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    // ✅ สำหรับออกใบรีพอร์ต - ดึงข้อมูลสรุปการเบิก-เติมยา
    // TransactionController.js - แก้ไข getReportData ให้ return ทั้งสองแบบ

    getReportData: async (req, res) => {
      try {
        const {
          location_id,
          group_location_id,
          start_date,
          end_date,
          user_ids, // ✅ รับเป็น string (comma-separated)
          product_ids,
        } = req.query;

        // ✅ แปลง comma-separated string เป็น array
        const userIdsArray = user_ids
          ? user_ids.split(",").map((id) => id.trim())
          : [];
        const productIdsArray = product_ids
          ? product_ids.split(",").map((id) => id.trim())
          : [];

        console.log("📊 Generating combined report:", {
          location_id,
          group_location_id,
          start_date,
          end_date,
          userIdsArray,
          productIdsArray,
        });

        // แปลงวันที่
        const startDateTime = new Date(start_date);
        startDateTime.setHours(0, 0, 0, 0);

        const endDateTime = new Date(end_date);
        endDateTime.setHours(23, 59, 59, 999);

        // สร้าง where condition สำหรับ Transaction
        let transactionWhereCondition = {
          status: {
            in: ["สำเร็จ", "success"],
          },
        };

        // เพิ่มเงื่อนไขวันที่ เฉพาะเมื่อมีการระบุ
        if (start_date && end_date) {
          const startDateTime = new Date(start_date);
          startDateTime.setHours(0, 0, 0, 0);
          const endDateTime = new Date(end_date);
          endDateTime.setHours(23, 59, 59, 999);
          transactionWhereCondition.created_at = {
            gte: startDateTime,
            lte: endDateTime,
          };
        } else if (start_date) {
          const startDateTime = new Date(start_date);
          startDateTime.setHours(0, 0, 0, 0);
          transactionWhereCondition.created_at = { gte: startDateTime };
        } else if (end_date) {
          const endDateTime = new Date(end_date);
          endDateTime.setHours(23, 59, 59, 999);
          transactionWhereCondition.created_at = { lte: endDateTime };
        }

        // เพิ่มเงื่อนไขตาม location หรือ group
        if (location_id) {
          transactionWhereCondition.User = {
            location_id: parseInt(location_id),
          };
        } else if (group_location_id) {
          transactionWhereCondition.User = {
            group_location_id: parseInt(group_location_id),
          };
        }

        // ✅ Filter ตาม user
        if (userIdsArray.length > 0) {
          transactionWhereCondition.user_id = {
            in: userIdsArray,
          };
        }

        // ✅ Filter ตาม product
        if (productIdsArray.length > 0) {
          transactionWhereCondition.Transaction_detail = {
            some: {
              product_id: {
                in: productIdsArray,
              },
            },
          };
        }

        // ดึงข้อมูล Transaction พร้อม Transaction_detail
        const transactions = await prisma.transaction.findMany({
          where: transactionWhereCondition,
          include: {
            Transaction_detail: {
              where:
                productIdsArray.length > 0
                  ? {
                      product_id: {
                        in: productIdsArray, // ✅ Filter ตาม product_ids (หลายรายการ)
                      },
                    }
                  : {},
              include: {
                Product: true,
                Slot: {
                  include: {
                    Locker: true,
                  },
                },
                Slot_stock: true,
              },
            },
            User: {
              include: {
                Location: {
                  include: {
                    Group_Location: true,
                  },
                },
                Role: true,
              },
            },
          },
          orderBy: {
            created_at: "desc",
          },
        });

        console.log(`📦 Found ${transactions.length} transactions`);

        // ========================================
        // ✅ 1. สร้าง SUMMARY DATA (aggregate by product)
        // ========================================
        const productMap = new Map();

        for (const transaction of transactions) {
          for (const detail of transaction.Transaction_detail) {
            const productId = detail.product_id;

            if (!productMap.has(productId)) {
              productMap.set(productId, {
                product_id: productId,
                product_name: detail.Product?.product_name || "ไม่ระบุ",
                total_restock: 0,
                total_withdraw: 0,
                current_stock: 0,
              });
            }

            const productData = productMap.get(productId);

            if (
              transaction.activity === "เติมยา" ||
              transaction.activity === "restock"
            ) {
              productData.total_restock += detail.amount || 0;
            } else if (
              transaction.activity === "เบิกยา" ||
              transaction.activity === "dispense"
            ) {
              productData.total_withdraw += detail.amount || 0;
            }
          }
        }

        // ดึง current stock สำหรับแต่ละ product
        let slotStockWhereCondition = {};

        if (location_id) {
          slotStockWhereCondition = {
            Slot: {
              location_id: parseInt(location_id),
            },
          };
        } else if (group_location_id) {
          slotStockWhereCondition = {
            Slot: {
              Location: {
                group_location_id: parseInt(group_location_id),
              },
            },
          };
        }

        if (productIdsArray.length > 0) {
          slotStockWhereCondition.product_id = {
            in: productIdsArray,
          };
        }

        const slotStocks = await prisma.slot_stock.findMany({
          where: slotStockWhereCondition,
          select: {
            product_id: true,
            amount: true,
          },
        });

        // Aggregate current stock by product
        const stockByProduct = new Map();
        for (const stock of slotStocks) {
          const currentAmount = stockByProduct.get(stock.product_id) || 0;
          stockByProduct.set(
            stock.product_id,
            currentAmount + (stock.amount || 0),
          );
        }

        // Update current_stock ใน productMap
        for (const [productId, productData] of productMap) {
          productData.current_stock = stockByProduct.get(productId) || 0;
        }

        // เพิ่ม products ที่มี stock แต่ไม่มี transaction ในช่วงเวลานี้
        for (const [productId, stockAmount] of stockByProduct) {
          if (!productMap.has(productId)) {
            const product = await prisma.product.findUnique({
              where: { product_id: productId },
            });

            productMap.set(productId, {
              product_id: productId,
              product_name: product?.product_name || "ไม่ระบุ",
              total_restock: 0,
              total_withdraw: 0,
              current_stock: stockAmount,
            });
          }
        }

        const summaryItems = Array.from(productMap.values());

        // ========================================
        // ✅ 2. สร้าง DETAILED DATA (transaction by transaction)
        // ========================================
        const detailedTransactions = transactions
          .filter((t) => t.Transaction_detail.length > 0) // เอาเฉพาะที่มี detail
          .map((transaction) => ({
            transaction_id: transaction.transaction_id,
            user_id: transaction.user_id,
            user_name: `${transaction.User.first_name} ${transaction.User.last_name}`,
            user_role: transaction.User.Role?.role_name || "N/A",
            activity: transaction.activity,
            status: transaction.status,
            location_name: transaction.User.Location?.location_name || "N/A",
            group_location_name:
              transaction.User.Location?.Group_Location?.group_location_name ||
              "N/A",
            created_at: transaction.created_at,
            items: transaction.Transaction_detail.map((detail) => ({
              product_id: detail.Product.product_id,
              product_name: detail.Product.product_name,
              lot_id: detail.Slot_stock.lot_id,
              slot_id: detail.Slot.slot_id,
              locker_id: detail.Slot.Locker.locker_id,
              locker_detail: detail.Slot.Locker.locker_location_detail,
              amount: detail.amount,
            })),
            total_amount: transaction.Transaction_detail.reduce(
              (sum, d) => sum + d.amount,
              0,
            ),
          }));

        // ========================================
        // ✅ 3. สร้าง SUMMARY STATISTICS
        // ========================================
        const summary = {
          // Summary Items
          total_products: summaryItems.length,
          total_restock_all: summaryItems.reduce(
            (sum, item) => sum + item.total_restock,
            0,
          ),
          total_withdraw_all: summaryItems.reduce(
            (sum, item) => sum + item.total_withdraw,
            0,
          ),
          total_current_stock: summaryItems.reduce(
            (sum, item) => sum + item.current_stock,
            0,
          ),

          // Detailed Transactions
          total_transactions: detailedTransactions.length,
          total_transaction_items: detailedTransactions.reduce(
            (sum, t) => sum + t.items.length,
            0,
          ),
          total_restock_transactions: detailedTransactions.filter(
            (t) => t.activity === "เติมยา" || t.activity === "restock",
          ).length,
          total_withdraw_transactions: detailedTransactions.filter(
            (t) => t.activity === "เบิกยา" || t.activity === "dispense",
          ).length,
        };

        //ดึงข้อมูล Location Info
        
        let locationInfo = {
          location_name: "ทั้งหมด",
          group_location_name: "ทั้งหมด",
        };

        if (location_id) {
          const location = await prisma.location.findUnique({
            where: { location_id: parseInt(location_id) },
            include: { Group_Location: true },
          });
          if (location) {
            locationInfo.location_name = location.location_name || "ไม่ระบุ";
            locationInfo.group_location_name =
              location.Group_Location?.group_location_name || "ไม่ระบุ";
          }
        } else if (group_location_id) {
          const groupLocation = await prisma.group_Location.findUnique({
            where: { group_location_id: parseInt(group_location_id) },
          });
          if (groupLocation) {
            locationInfo.location_name = "ทุกสถานที่ในกลุ่ม";
            locationInfo.group_location_name =
              groupLocation.group_location_name || "ไม่ระบุ";
          }
        }
        

        // ✅ ดึงข้อมูล User/Product ที่ถูก filter (สำหรับแสดงใน report)
        let filterInfo = {
          user_names: [],
          product_names: [],
        };

        if (userIdsArray.length > 0) {
          const users = await prisma.user.findMany({
            where: { user_id: { in: userIdsArray } },
          });
          filterInfo.user_names = users.map(
            (u) => `${u.first_name} ${u.last_name}`,
          );
        }

        if (productIdsArray.length > 0) {
          const productsData = await prisma.product.findMany({
            where: { product_id: { in: productIdsArray } },
          });
          filterInfo.product_names = productsData.map((p) => p.product_name);
        }

        console.log(
          `✅ Report generated with ${summaryItems.length} products and ${detailedTransactions.length} transactions`,
        );

        // ========================================
        // ✅ 5. ส่งข้อมูลทั้งหมดกลับไป
        // ========================================
        res.status(200).json({
          message: "ดึงข้อมูลรีพอร์ตสำเร็จ",
          report: {
            location_name: locationInfo.location_name,
            group_location_name: locationInfo.group_location_name,
            start_date: start_date,
            end_date: end_date,
            generated_at: new Date().toISOString(),

            filters: {
              user_ids: userIdsArray,
              user_names: filterInfo.user_names,
              product_ids: productIdsArray,
              product_names: filterInfo.product_names,
            },

            summary_items: summaryItems,
            detailed_transactions: detailedTransactions,
            summary: summary,
          },
        });
      } catch (error) {
        console.error("Get report data error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },

    createTransactionFromLocker: async (req, res) => {
      try {
        const { transaction, details, slot_stocks } = req.body;

        const result = await prisma.$transaction(async (tx) => {
          // 1. สร้าง Transaction หลักก่อน
          const newTransaction = await tx.transaction.create({
            data: {
              user_id: transaction.user_id,
              activity: transaction.activity,
              status: transaction.status,
              created_at: new Date(transaction.created_at),
            },
          });

          // 2. จัดการ slot_stocks และเก็บ "Map ของ ID" ไว้
          // key: ID จาก locker, value: ID จริงใน database server
          const idMapping = {};

          await Promise.all(
            slot_stocks.map(async (stock) => {
              let updatedOrCreatedStock;

              // ตรวจสอบว่ามีอยู่แล้วในระบบเราหรือไม่ (อาจจะเช็คจาก slot_id + lot_id แทนการใช้ ID ตรงๆ)
              const existingStock = await tx.slot_stock.findFirst({
                where: {
                  slot_id: parseInt(stock.slot_id),
                  lot_id: stock.lot_id,
                  product_id: stock.product_id,
                },
              });

              if (!existingStock) {
                updatedOrCreatedStock = await tx.slot_stock.create({
                  data: {
                    lot_id: stock.lot_id,
                    product_id: stock.product_id,
                    slot_id: parseInt(stock.slot_id),
                    amount: parseInt(stock.amount),
                    expired_at: new Date(stock.expired_at),
                  },
                });
              } else {
                updatedOrCreatedStock = await tx.slot_stock.update({
                  where: { slot_stock_id: existingStock.slot_stock_id },
                  data: {
                    //เปลี่ยนจากการอัพเดทเป็นการบวกจำนวนแทน
                    amount: parseInt(stock.amount),
                    updated_at: new Date(),
                  },
                });
              }

              // เก็บการจับคู่ ID ไว้: "ID ของ locker" -> "ID ของ server"
              idMapping[stock.slot_stock_id] =
                updatedOrCreatedStock.slot_stock_id;
            }),
          );

          // 3. สร้าง Details โดยใช้ ID ที่ถูกต้องจาก Mapping
          const newDetails = await Promise.all(
            details.map((detail) => {
              // ดึง ID จริงของ Server ออกมาโดยใช้ ID จาก Locker เป็น Key
              const serverSlotStockId = idMapping[detail.slot_stock_id];

              return tx.transaction_detail.create({
                data: {
                  transaction_id: newTransaction.transaction_id,
                  product_id: detail.product_id,
                  slot_id: parseInt(detail.slot_id),
                  slot_stock_id: serverSlotStockId, // ใช้ ID ที่ได้จาก Server
                  amount: parseInt(detail.amount),
                  created_at: new Date(transaction.created_at),
                },
              });
            }),
          );

          return { newTransaction, newDetails };
        });

        res.status(201).json({
          message: "Transaction created successfully",
          transaction_id: result.newTransaction.transaction_id,
        });
      } catch (error) {
        console.error("createTransactionFromLocker error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  },
};