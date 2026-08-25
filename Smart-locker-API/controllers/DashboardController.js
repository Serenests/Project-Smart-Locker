// controllers/DashboardController.js
const prisma = require("../lib/prisma");

/**
 * สร้าง filter scope ตาม role ของผู้ใช้
 * Role 1 (System Admin): เห็นทุกอย่าง
 * Role 2 (Organize Admin): เห็นเฉพาะ group_location_id ตัวเอง
 * Role 3 (Department Admin): เห็นเฉพาะ location_id ตัวเอง
 */
const getScopeFilter = (user) => {
  const { role, groupLocationId, locationId } = user;

  if (role === 1) {
    return {
      userFilter: {},
      locationFilter: {},
      lockerFilter: {},
      transactionFilter: {},
      slotFilter: {},
    };
  }

  if (role === 2) {
    return {
      userFilter: { group_location_id: groupLocationId },
      locationFilter: { group_location_id: groupLocationId },
      lockerFilter: { Location: { group_location_id: groupLocationId } },
      transactionFilter: { User: { group_location_id: groupLocationId } },
      slotFilter: { Location: { group_location_id: groupLocationId } },
    };
  }

  if (role === 3) {
    return {
      userFilter: { location_id: locationId },
      locationFilter: { location_id: locationId },
      lockerFilter: { location_id: locationId },
      transactionFilter: { User: { location_id: locationId } },
      slotFilter: { location_id: locationId },
    };
  }

  // Role 4 หรืออื่นๆ - ไม่ควรเข้าถึงได้
  return {
    userFilter: { user_id: "none" },
    locationFilter: { location_id: -1 },
    lockerFilter: { locker_id: -1 },
    transactionFilter: { transaction_id: -1 },
    slotFilter: { slot_id: -1 },
  };
};

// Helper สร้าง date range ของแต่ละวัน
const getDayRange = (offsetFromToday) => {
  const date = new Date();
  date.setDate(date.getDate() - offsetFromToday);
  return {
    date,
    start: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
    ),
    end: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
    ),
  };
};

// Helper สร้าง date range ของแต่ละเดือน
const getMonthRange = (offsetFromNow) => {
  const date = new Date();
  date.setMonth(date.getMonth() - offsetFromNow);
  return {
    date,
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59),
  };
};

// Helper สร้าง date range ของแต่ละปี
const getYearRange = (offsetFromNow) => {
  const year = new Date().getFullYear() - offsetFromNow;
  return {
    year,
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59),
  };
};

// Activity / Status constants
const WITHDRAW_ACTIVITIES = ["เบิกยา", "dispense"];
const RESTOCK_ACTIVITIES = ["เติมยา", "restock"];
const SUCCESS_STATUSES = ["สำเร็จ", "success"];
const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

module.exports = {
  DashboardController: {
    // ============================================================
    // getAllStats — ดึงข้อมูล Dashboard ทั้งหมด (RBAC)
    // ============================================================
    getAllStats: async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            message: "ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่",
            requireLogin: true,
          });
        }

        const user = {
          userId: req.user.userId,
          role: req.user.role,
          groupLocationId: req.user.groupLocationId,
          locationId: req.user.locationId,
        };

        console.log("📊 Dashboard request from user:", user);

        const scope = getScopeFilter(user);

        // ----------------------------------------------------------
        // 1. ดึง locationIds และ userIds ใน scope (จำเป็นสำหรับ query อื่นๆ)
        // ----------------------------------------------------------
        const [locationsInScope, usersInScope] = await Promise.all([
          prisma.location.findMany({
            where: { deleted_at: null, ...scope.locationFilter },
            select: { location_id: true, location_name: true },
          }),
          prisma.user.findMany({
            where: { deleted_at: null, ...scope.userFilter },
            select: { user_id: true },
          }),
        ]);

        const locationIds = locationsInScope.map((l) => l.location_id);
        const userIds = usersInScope.map((u) => u.user_id);

        // ใช้ fallback เพื่อป้องกัน Prisma error กรณี array ว่าง
        const safeLocationIds = locationIds.length > 0 ? locationIds : [-1];
        const safeUserIds = userIds.length > 0 ? userIds : [EMPTY_UUID];

        // ----------------------------------------------------------
        // 2. Date ranges
        // ----------------------------------------------------------
        const now = new Date();
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0,
        );
        const endOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        );
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // ----------------------------------------------------------
        // 3. Basic stats + Transaction summary — รัน parallel ทั้งหมด
        // ----------------------------------------------------------
        const [
          totalUsers,
          totalLocations,
          totalLockers,
          onlineLockers,
          offlineLockers,
          totalProducts,
          totalSlots,
          totalTransactions,
          todayTransactions,
          todayWithdraw,
          todayRestock,
          monthWithdraw,
          monthRestock,
          yearWithdraw,
          yearRestock,
        ] = await Promise.all([
          prisma.user.count({
            where: { deleted_at: null, ...scope.userFilter },
          }),
          prisma.location.count({
            where: { deleted_at: null, ...scope.locationFilter },
          }),
          prisma.locker.count({
            where: { deleted_at: null, location_id: { in: safeLocationIds } },
          }),
          prisma.locker.count({
            where: {
              deleted_at: null,
              locker_status: true,
              location_id: { in: safeLocationIds },
            },
          }),
          prisma.locker.count({
            where: {
              deleted_at: null,
              locker_status: false,
              location_id: { in: safeLocationIds },
            },
          }),
          prisma.product.count({ where: { deleted_at: null } }),
          prisma.slot.count({
            where: { deleted_at: null, location_id: { in: safeLocationIds } },
          }),

          // Transactions
          prisma.transaction.count({
            where: { deleted_at: null, user_id: { in: safeUserIds } },
          }),
          prisma.transaction.count({
            where: {
              deleted_at: null,
              user_id: { in: safeUserIds },
              created_at: { gte: startOfToday, lte: endOfToday },
            },
          }),

          // Today withdraw / restock
          prisma.transaction.count({
            where: {
              deleted_at: null,
              user_id: { in: safeUserIds },
              created_at: { gte: startOfToday, lte: endOfToday },
              activity: { in: WITHDRAW_ACTIVITIES },
              status: { in: SUCCESS_STATUSES },
            },
          }),
          prisma.transaction.count({
            where: {
              deleted_at: null,
              user_id: { in: safeUserIds },
              created_at: { gte: startOfToday, lte: endOfToday },
              activity: { in: RESTOCK_ACTIVITIES },
              status: { in: SUCCESS_STATUSES },
            },
          }),

          // Month withdraw / restock
          prisma.transaction.count({
            where: {
              deleted_at: null,
              user_id: { in: safeUserIds },
              created_at: { gte: startOfMonth },
              activity: { in: WITHDRAW_ACTIVITIES },
              status: { in: SUCCESS_STATUSES },
            },
          }),
          prisma.transaction.count({
            where: {
              deleted_at: null,
              user_id: { in: safeUserIds },
              created_at: { gte: startOfMonth },
              activity: { in: RESTOCK_ACTIVITIES },
              status: { in: SUCCESS_STATUSES },
            },
          }),

          // Year withdraw / restock
          prisma.transaction.count({
            where: {
              deleted_at: null,
              user_id: { in: safeUserIds },
              created_at: { gte: startOfYear },
              activity: { in: WITHDRAW_ACTIVITIES },
              status: { in: SUCCESS_STATUSES },
            },
          }),
          prisma.transaction.count({
            where: {
              deleted_at: null,
              user_id: { in: safeUserIds },
              created_at: { gte: startOfYear },
              activity: { in: RESTOCK_ACTIVITIES },
              status: { in: SUCCESS_STATUSES },
            },
          }),
        ]);

        // ----------------------------------------------------------
        // 4. Chart data — daily / monthly / yearly รัน parallel
        // ----------------------------------------------------------
        const [dailyChartData, monthlyChartData, yearlyChartData] =
          await Promise.all([
            // Daily (7 วันล่าสุด)
            Promise.all(
              Array.from({ length: 7 }, (_, i) => {
                const { date, start, end } = getDayRange(6 - i);
                return Promise.all([
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: WITHDRAW_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: RESTOCK_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                ]).then(([withdraw, restock]) => ({
                  date: date.toLocaleDateString("th-TH", {
                    day: "2-digit",
                    month: "short",
                  }),
                  withdraw,
                  restock,
                }));
              }),
            ),

            // Monthly (6 เดือนล่าสุด)
            Promise.all(
              Array.from({ length: 6 }, (_, i) => {
                const { date, start, end } = getMonthRange(5 - i);
                return Promise.all([
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: WITHDRAW_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: RESTOCK_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                ]).then(([withdraw, restock]) => ({
                  month: date.toLocaleDateString("th-TH", {
                    month: "short",
                    year: "2-digit",
                  }),
                  withdraw,
                  restock,
                }));
              }),
            ),

            // Yearly (3 ปีล่าสุด)
            Promise.all(
              Array.from({ length: 3 }, (_, i) => {
                const { year, start, end } = getYearRange(2 - i);
                return Promise.all([
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: WITHDRAW_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: RESTOCK_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                ]).then(([withdraw, restock]) => ({
                  year: (year + 543).toString(),
                  withdraw,
                  restock,
                }));
              }),
            ),
          ]);

        // ----------------------------------------------------------
        // 5. Transactions แยกตาม Location — parallel ต่อ location
        // ----------------------------------------------------------
        const transactionsByLocation = await Promise.all(
          locationsInScope.map(async (location) => {
            const usersInLocation = await prisma.user.findMany({
              where: { location_id: location.location_id, deleted_at: null },
              select: { user_id: true },
            });
            const uids = usersInLocation.map((u) => u.user_id);
            const safeUids = uids.length > 0 ? uids : [EMPTY_UUID];

            const count = await prisma.transaction.count({
              where: { deleted_at: null, user_id: { in: safeUids } },
            });

            return {
              location: location.location_name || "ไม่ระบุ",
              location_id: location.location_id,
              transactions: count,
            };
          }),
        );
        transactionsByLocation.sort((a, b) => b.transactions - a.transactions);

        // ----------------------------------------------------------
        // 6. Recent Transactions + Locker data — parallel
        // ----------------------------------------------------------
        const [recentTransactions, lockerData] = await Promise.all([
          prisma.transaction.findMany({
            where: { deleted_at: null, user_id: { in: safeUserIds } },
            orderBy: { created_at: "desc" },
            take: 5,
            include: {
              User: {
                select: {
                  first_name: true,
                  last_name: true,
                  Location: { select: { location_name: true } },
                },
              },
              Transaction_detail: {
                take: 1,
                include: { Product: { select: { product_name: true } } },
              },
            },
          }),
          prisma.locker.findMany({
            where: { deleted_at: null, location_id: { in: safeLocationIds } },
            include: {
              Location: {
                select: {
                  location_name: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
            orderBy: { locker_status: "desc" },
          }),
        ]);

        // ----------------------------------------------------------
        // 7. Format & Response
        // ----------------------------------------------------------
        const formattedRecentTransactions = recentTransactions.map((t) => ({
          transaction_id: t.transaction_id,
          activity: t.activity,
          status: t.status,
          created_at: t.created_at,
          first_name: t.User?.first_name || "",
          last_name: t.User?.last_name || "",
          location_name: t.User?.Location?.location_name || "ไม่ระบุสถานที่",
          product_name:
            t.Transaction_detail?.[0]?.Product?.product_name || "ไม่ระบุสินค้า",
          amount: t.Transaction_detail?.[0]?.amount || 0,
          image_path: "/placeholder.svg",
        }));

        const formattedLockerLocations = lockerData.map((locker) => ({
          locker_id: locker.locker_id,
          locker_ip:
            locker.locker_location_detail || `Locker-${locker.locker_id}`,
          location_name: locker.Location?.location_name || "ไม่ระบุ",
          latitude: locker.Location?.latitude,
          longitude: locker.Location?.longitude,
          status: locker.locker_status ? "online" : "offline",
        }));

        const formattedLockerStatus = lockerData.map((locker) => ({
          locker_id: locker.locker_id,
          locker_ip:
            locker.locker_location_detail || `Locker-${locker.locker_id}`,
          location_name: locker.Location?.location_name || "ไม่ระบุ",
          status: locker.locker_status ? "online" : "offline",
        }));

        console.log("✅ Dashboard stats generated for role:", user.role);

        res.status(200).json({
          stats: {
            total_users: totalUsers,
            total_lockers: totalLockers,
            total_locations: totalLocations,
            total_medications: totalProducts,
            total_slots: totalSlots,
            today_transactions: todayTransactions,
            total_transactions: totalTransactions,
            online_lockers: onlineLockers,
            offline_lockers: offlineLockers,
          },
          transactionChart: {
            daily: dailyChartData,
            monthly: monthlyChartData,
            yearly: yearlyChartData,
          },
          transactionSummary: {
            daily: {
              withdraw: todayWithdraw,
              restock: todayRestock,
              total: todayWithdraw + todayRestock,
            },
            monthly: {
              withdraw: monthWithdraw,
              restock: monthRestock,
              total: monthWithdraw + monthRestock,
            },
            yearly: {
              withdraw: yearWithdraw,
              restock: yearRestock,
              total: yearWithdraw + yearRestock,
            },
          },
          transactionsByLocation,
          recentTransactions: formattedRecentTransactions,
          lockerLocations: formattedLockerLocations,
          lockerStatus: formattedLockerStatus,
          userScope: {
            role: user.role,
            groupLocationId: user.groupLocationId,
            locationId: user.locationId,
          },
        });
      } catch (error) {
        console.error("❌ Dashboard stats error:", error);
        res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาด", error: error.message });
      }
    },

    // ============================================================
    // getTransactionChartByLocation — Chart แยกตาม location
    // ============================================================
    getTransactionChartByLocation: async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            message: "ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่",
            requireLogin: true,
          });
        }

        const user = {
          userId: req.user.userId,
          role: req.user.role,
          groupLocationId: req.user.groupLocationId,
          locationId: req.user.locationId,
        };

        const requestedLocationId = req.query.location_id
          ? parseInt(req.query.location_id)
          : null;

        console.log(
          "📊 Fetching transaction chart for location:",
          requestedLocationId || "all",
        );

        const scope = getScopeFilter(user);

        // ดึง users ใน scope (กรองตาม location ถ้าระบุมา)
        const userWhere = {
          deleted_at: null,
          ...scope.userFilter,
          ...(requestedLocationId ? { location_id: requestedLocationId } : {}),
        };

        const usersInScope = await prisma.user.findMany({
          where: userWhere,
          select: { user_id: true },
        });

        const userIds = usersInScope.map((u) => u.user_id);
        const safeUserIds = userIds.length > 0 ? userIds : [EMPTY_UUID];

        console.log(`👥 Found ${userIds.length} users in scope`);

        // Daily / Monthly / Yearly รัน parallel ทั้งหมด
        const [dailyChartData, monthlyChartData, yearlyChartData] =
          await Promise.all([
            // Daily (7 วันล่าสุด)
            Promise.all(
              Array.from({ length: 7 }, (_, i) => {
                const { date, start, end } = getDayRange(6 - i);
                return Promise.all([
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: WITHDRAW_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: RESTOCK_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                ]).then(([withdraw, restock]) => ({
                  date: date.toLocaleDateString("th-TH", {
                    day: "2-digit",
                    month: "short",
                  }),
                  withdraw,
                  restock,
                }));
              }),
            ),

            // Monthly (6 เดือนล่าสุด)
            Promise.all(
              Array.from({ length: 6 }, (_, i) => {
                const { date, start, end } = getMonthRange(5 - i);
                return Promise.all([
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: WITHDRAW_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: RESTOCK_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                ]).then(([withdraw, restock]) => ({
                  month: date.toLocaleDateString("th-TH", {
                    month: "short",
                    year: "2-digit",
                  }),
                  withdraw,
                  restock,
                }));
              }),
            ),

            // Yearly (3 ปีล่าสุด)
            Promise.all(
              Array.from({ length: 3 }, (_, i) => {
                const { year, start, end } = getYearRange(2 - i);
                return Promise.all([
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: WITHDRAW_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                  prisma.transaction.count({
                    where: {
                      deleted_at: null,
                      user_id: { in: safeUserIds },
                      created_at: { gte: start, lte: end },
                      activity: { in: RESTOCK_ACTIVITIES },
                      status: { in: SUCCESS_STATUSES },
                    },
                  }),
                ]).then(([withdraw, restock]) => ({
                  year: (year + 543).toString(),
                  withdraw,
                  restock,
                }));
              }),
            ),
          ]);

        console.log("✅ Transaction chart generated successfully");

        res.status(200).json({
          transactionChart: {
            daily: dailyChartData,
            monthly: monthlyChartData,
            yearly: yearlyChartData,
          },
          location_id: requestedLocationId,
          user_count: userIds.length,
        });
      } catch (error) {
        console.error("❌ Transaction chart error:", error);
        res
          .status(500)
          .json({ message: "เกิดข้อผิดพลาด", error: error.message });
      }
    },

    // ============================================================
    // countUser
    // ============================================================
    countUser: async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            message: "ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่",
            requireLogin: true,
          });
        }

        const user = {
          role: req.user.role,
          groupLocationId: req.user.groupLocationId,
          locationId: req.user.locationId,
        };
        const scope = getScopeFilter(user);

        const userCount = await prisma.user.count({
          where: { deleted_at: null, ...scope.userFilter },
        });

        res.status(200).json({
          message: "ดึงข้อมูลจำนวนผู้ใช้สำเร็จ",
          count: userCount,
        });
      } catch (error) {
        console.error("Count user error:", error);
        res.status(500).json({
          message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์",
          error: error.message,
        });
      }
    },
  },
};
