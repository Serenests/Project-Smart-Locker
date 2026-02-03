// controllers/DashboardController.js
const { PrismaClient } = require('@prisma/client');
const prisma = require('../lib/prisma');

/**
 * สร้าง filter scope ตาม role ของผู้ใช้
 * Role 1 (System Admin): เห็นทุกอย่าง
 * Role 2 (Organize Admin): เห็นเฉพาะ group_location_id ตัวเอง
 * Role 3 (Department Admin): เห็นเฉพาะ location_id ตัวเอง
 */

const countTransactionsWithUsers = async (userIds, whereConditions = {}) => {
  if (userIds.length === 0) return 0;
  
  return await prisma.transaction.count({
    where: {
      deleted_at: null,
      user_id: { in: userIds },
      ...whereConditions
    }
  });
};

const getScopeFilter = (user) => {
  const { role, groupLocationId, locationId } = user;

  if (role === 1) {
    // System Admin - ไม่มี filter
    return {
      userFilter: {},
      locationFilter: {},
      lockerFilter: {},
      transactionFilter: {},
      slotFilter: {}
    };
  }

  if (role === 2) {
    // Organize Admin - filter ตาม group_location_id
    return {
      userFilter: { group_location_id: groupLocationId },
      locationFilter: { group_location_id: groupLocationId },
      lockerFilter: { Location: { group_location_id: groupLocationId } },
      transactionFilter: { User: { group_location_id: groupLocationId } },
      slotFilter: { Location: { group_location_id: groupLocationId } }
    };
  }

  if (role === 3) {
    // Department Admin - filter ตาม location_id
    return {
      userFilter: { location_id: locationId },
      locationFilter: { location_id: locationId },
      lockerFilter: { location_id: locationId },
      transactionFilter: { User: { location_id: locationId } },
      slotFilter: { location_id: locationId }
    };
  }

  // Role 4 หรืออื่นๆ - ไม่ควรเข้าถึงได้
  return {
    userFilter: { user_id: 'none' }, // ไม่มีผลลัพธ์
    locationFilter: { location_id: -1 },
    lockerFilter: { locker_id: -1 },
    transactionFilter: { transaction_id: -1 },
    slotFilter: { slot_id: -1 }
  };
};

module.exports = {
  DashboardController: {

    // ดึง Transaction Chart ตาม Location
    getTransactionChartByLocation: async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
            requireLogin: true
          });
        }

        const user = {
          userId: req.user.userId,
          role: req.user.role,
          groupLocationId: req.user.groupLocationId,
          locationId: req.user.locationId
        };

        // รับ location_id จาก query parameter
        const requestedLocationId = req.query.location_id 
          ? parseInt(req.query.location_id) 
          : null;
        
        console.log('📊 Fetching transaction chart for location:', requestedLocationId || 'all');

        // สร้าง scope filter
        const scope = getScopeFilter(user);
        let usersInScope = [];

        if (requestedLocationId && requestedLocationId !== 'all') {
          // ดึง users จาก location ที่เลือก (พร้อมตรวจสอบสิทธิ์)
          usersInScope = await prisma.user.findMany({
            where: {
              location_id: requestedLocationId,
              deleted_at: null,
              ...scope.userFilter
            },
            select: { user_id: true }
          });
        } else {
          // ดึง users ทั้งหมดใน scope
          usersInScope = await prisma.user.findMany({
            where: {
              deleted_at: null,
              ...scope.userFilter
            },
            select: { user_id: true }
          });
        }

        const userIds = usersInScope.map(u => u.user_id);
        console.log(`👥 Found ${userIds.length} users in scope`);

        const now = new Date();

        // ============================================
        // Daily Chart (7 วันล่าสุด)
        // ============================================
        const dailyChartData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
          const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

          const dayWithdraw = await countTransactionsWithUsers(userIds, {
            created_at: { gte: dayStart, lte: dayEnd },
            activity: 'เบิกยา',
            status: 'สำเร็จ'
          });

          const dayRestock = await countTransactionsWithUsers(userIds, {
            created_at: { gte: dayStart, lte: dayEnd },
            activity: 'เติมยา',
            status: 'สำเร็จ'
          });

          dailyChartData.push({
            date: date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }),
            withdraw: dayWithdraw,
            restock: dayRestock
          });
        }

        // ============================================
        // Monthly Chart (6 เดือนล่าสุด)
        // ============================================
        const monthlyChartData = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

          const monthWithdraw = await countTransactionsWithUsers(userIds, {
            created_at: { gte: monthStart, lte: monthEnd },
            activity: 'เบิกยา',
            status: 'สำเร็จ'
          });

          const monthRestock = await countTransactionsWithUsers(userIds, {
            created_at: { gte: monthStart, lte: monthEnd },
            activity: 'เติมยา',
            status: 'สำเร็จ'
          });

          monthlyChartData.push({
            month: date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
            withdraw: monthWithdraw,
            restock: monthRestock
          });
        }

        // ============================================
        // Yearly Chart (3 ปีล่าสุด)
        // ============================================
        const yearlyChartData = [];
        for (let i = 2; i >= 0; i--) {
          const year = now.getFullYear() - i;
          const yearStart = new Date(year, 0, 1);
          const yearEnd = new Date(year, 11, 31, 23, 59, 59);

          const yearWithdraw = await countTransactionsWithUsers(userIds, {
            created_at: { gte: yearStart, lte: yearEnd },
            activity: 'เบิกยา',
            status: 'สำเร็จ'
          });

          const yearRestock = await countTransactionsWithUsers(userIds, {
            created_at: { gte: yearStart, lte: yearEnd },
            activity: 'เติมยา',
            status: 'สำเร็จ'
          });

          yearlyChartData.push({
            year: (year + 543).toString(),
            withdraw: yearWithdraw,
            restock: yearRestock
          });
        }

        console.log('✅ Transaction chart generated successfully');

        res.status(200).json({
          transactionChart: {
            daily: dailyChartData,
            monthly: monthlyChartData,
            yearly: yearlyChartData
          },
          location_id: requestedLocationId,
          user_count: userIds.length
        });

      } catch (error) {
        console.error('❌ Transaction chart error:', error);
        res.status(500).json({ 
          message: 'เกิดข้อผิดพลาด',
          error: error.message
        });
      }
    },

    // รวมข้อมูลทั้งหมดไว้ใน endpoint เดียว - รองรับ RBAC
    getAllStats: async (req, res) => {
      try {
        // ✅ ตรวจสอบว่ามี req.user หรือไม่
        if (!req.user) {
          return res.status(401).json({
            message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
            requireLogin: true
          });
        }

        // ✅ ดึงข้อมูล user จาก token (ใช้ชื่อตัวแปรตามที่ JWT sign ไว้)
        const user = {
          userId: req.user.userId,
          role: req.user.role,
          groupLocationId: req.user.groupLocationId,
          locationId: req.user.locationId
        };

        console.log('📊 Dashboard request from user:', user);

        // ✅ สร้าง scope filter ตาม role
        const scope = getScopeFilter(user);

        // วันที่ปัจจุบัน
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        
        // เริ่มต้นของเดือนและปี
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // ============================================
        // ดึงข้อมูลพื้นฐานแบบ filtered ตาม scope
        // ============================================
        
        // ✅ นับผู้ใช้ตาม scope
        const totalUsers = await prisma.user.count({
          where: {
            deleted_at: null,
            ...scope.userFilter
          }
        });

        // ✅ นับ Locations ตาม scope
        const totalLocations = await prisma.location.count({
          where: {
            deleted_at: null,
            ...scope.locationFilter
          }
        });

        // ✅ ดึง location_ids ใน scope (สำหรับใช้ filter อื่นๆ)
        let locationIds = [];
        if (user.role === 1) {
          // System Admin - ทุก location
          const allLocations = await prisma.location.findMany({
            where: { deleted_at: null },
            select: { location_id: true }
          });
          locationIds = allLocations.map(l => l.location_id);
        } else if (user.role === 2) {
          // Organize Admin - locations ใน group
          const groupLocations = await prisma.location.findMany({
            where: { 
              group_location_id: user.groupLocationId,
              deleted_at: null 
            },
            select: { location_id: true }
          });
          locationIds = groupLocations.map(l => l.location_id);
        } else if (user.role === 3) {
          // Department Admin - เฉพาะ location ตัวเอง
          locationIds = user.locationId ? [user.locationId] : [];
        }

        // ✅ นับ Lockers ตาม scope
        const totalLockers = await prisma.locker.count({
          where: {
            deleted_at: null,
            location_id: { in: locationIds.length > 0 ? locationIds : [-1] }
          }
        });

        // ✅ นับ locker online/offline ตาม scope
        const onlineLockers = await prisma.locker.count({
          where: { 
            locker_status: true,
            deleted_at: null,
            location_id: { in: locationIds.length > 0 ? locationIds : [-1] }
          }
        });

        const offlineLockers = await prisma.locker.count({
          where: { 
            locker_status: false,
            deleted_at: null,
            location_id: { in: locationIds.length > 0 ? locationIds : [-1] }
          }
        });

        // ✅ นับ Products (ยาทั้งหมด - ไม่ filter ตาม location เพราะเป็น master data)
        const totalProducts = await prisma.product.count({
          where: { deleted_at: null }
        });

        // ✅ นับ Slots ตาม scope
        const totalSlots = await prisma.slot.count({
          where: {
            deleted_at: null,
            location_id: { in: locationIds.length > 0 ? locationIds : [-1] }
          }
        });

        // ============================================
        // ดึงข้อมูล Transactions แบบ filtered
        // ============================================

        // ✅ ดึง user_ids ใน scope (สำหรับ filter transactions)
        const usersInScope = await prisma.user.findMany({
          where: {
            deleted_at: null,
            ...scope.userFilter
          },
          select: { user_id: true }
        });
        const userIds = usersInScope.map(u => u.user_id);

        // ใช้ UUID ว่างเปล่าสำหรับกรณีไม่มี users
        const emptyUUID = '00000000-0000-0000-0000-000000000000';

        // ✅ Transaction ทั้งหมดใน scope
        const totalTransactions = await prisma.transaction.count({
          where: {
            deleted_at: null,
            user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
          }
        });

        // ✅ Transaction วันนี้
        const todayTransactions = await prisma.transaction.count({
          where: {
            deleted_at: null,
            user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] },
            created_at: {
              gte: startOfToday,
              lte: endOfToday
            }
          }
        });

        // ============================================
        // Transaction Chart Data (เบิก/เติม)
        // ============================================

        // วันนี้
        const todayWithdraw = await prisma.transaction.count({
          where: {
            created_at: { gte: startOfToday, lte: endOfToday },
            activity: 'เบิกยา',
            status: 'สำเร็จ',
            deleted_at: null,
            user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
          }
        });

        const todayRestock = await prisma.transaction.count({
          where: {
            created_at: { gte: startOfToday, lte: endOfToday },
            activity: 'เติมยา',
            status: 'สำเร็จ',
            deleted_at: null,
            user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
          }
        });

        // เดือนนี้
        const monthWithdraw = await prisma.transaction.count({
          where: {
            created_at: { gte: startOfMonth },
            activity: 'เบิกยา',
            status: 'สำเร็จ',
            deleted_at: null,
            user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
          }
        });

        const monthRestock = await prisma.transaction.count({
          where: {
            created_at: { gte: startOfMonth },
            activity: 'เติมยา',
            status: 'สำเร็จ',
            deleted_at: null,
            user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
          }
        });

        // ปีนี้
        const yearWithdraw = await prisma.transaction.count({
          where: {
            created_at: { gte: startOfYear },
            activity: 'เบิกยา',
            status: 'สำเร็จ',
            deleted_at: null,
            user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
          }
        });

        const yearRestock = await prisma.transaction.count({
          where: {
            created_at: { gte: startOfYear },
            activity: 'เติมยา',
            status: 'สำเร็จ',
            deleted_at: null,
            user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
          }
        });

        // ============================================
        // ดึงข้อมูล Daily Transactions (7 วันล่าสุด)
        // ============================================
        const dailyChartData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
          const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

          const dayWithdraw = await prisma.transaction.count({
            where: {
              created_at: { gte: dayStart, lte: dayEnd },
              activity: 'เบิกยา',
              status: 'สำเร็จ',
              deleted_at: null,
              user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
            }
          });

          const dayRestock = await prisma.transaction.count({
            where: {
              created_at: { gte: dayStart, lte: dayEnd },
              activity: 'เติมยา',
              status: 'สำเร็จ',
              deleted_at: null,
              user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
            }
          });

          dailyChartData.push({
            date: date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }),
            withdraw: dayWithdraw,
            restock: dayRestock
          });
        }

        // ============================================
        // ดึงข้อมูล Monthly Transactions (6 เดือนล่าสุด)
        // ============================================
        const monthlyChartData = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

          const monthWithdrawCount = await prisma.transaction.count({
            where: {
              created_at: { gte: monthStart, lte: monthEnd },
              activity: 'เบิกยา',
              status: 'สำเร็จ',
              deleted_at: null,
              user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
            }
          });

          const monthRestockCount = await prisma.transaction.count({
            where: {
              created_at: { gte: monthStart, lte: monthEnd },
              activity: 'เติมยา',
              status: 'สำเร็จ',
              deleted_at: null,
              user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
            }
          });

          monthlyChartData.push({
            month: date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
            withdraw: monthWithdrawCount,
            restock: monthRestockCount
          });
        }

        // ============================================
        // ดึงข้อมูล Yearly Transactions (3 ปีล่าสุด)
        // ============================================
        const yearlyChartData = [];
        for (let i = 2; i >= 0; i--) {
          const year = new Date().getFullYear() - i;
          const yearStart = new Date(year, 0, 1);
          const yearEnd = new Date(year, 11, 31, 23, 59, 59);

          const yearWithdrawCount = await prisma.transaction.count({
            where: {
              created_at: { gte: yearStart, lte: yearEnd },
              activity: 'เบิกยา',
              status: 'สำเร็จ',
              deleted_at: null,
              user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
            }
          });

          const yearRestockCount = await prisma.transaction.count({
            where: {
              created_at: { gte: yearStart, lte: yearEnd },
              activity: 'เติมยา',
              status: 'สำเร็จ',
              deleted_at: null,
              user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
            }
          });

          yearlyChartData.push({
            year: (year + 543).toString(), // พ.ศ.
            withdraw: yearWithdrawCount,
            restock: yearRestockCount
          });
        }

        // ============================================
        // Transaction แยกตาม Location
        // ============================================
        const locationsInScope = await prisma.location.findMany({
          where: {
            deleted_at: null,
            location_id: { in: locationIds.length > 0 ? locationIds : [-1] }
          },
          select: {
            location_id: true,
            location_name: true
          }
        });

        const transactionsByLocation = await Promise.all(
          locationsInScope.map(async (location) => {
            // ดึง users ใน location นี้
            const usersInLocation = await prisma.user.findMany({
              where: { 
                location_id: location.location_id,
                deleted_at: null 
              },
              select: { user_id: true }
            });
            const userIdsInLocation = usersInLocation.map(u => u.user_id);

            const count = await prisma.transaction.count({
              where: {
                deleted_at: null,
                user_id: { in: userIdsInLocation.length > 0 ? userIdsInLocation : [emptyUUID] }
              }
            });

            return {
              location: location.location_name || 'ไม่ระบุ',
              location_id: location.location_id,
              transactions: count
            };
          })
        );

        // Sort by transactions descending
        transactionsByLocation.sort((a, b) => b.transactions - a.transactions);

        // ============================================
        // Recent Transactions (5 รายการล่าสุด)
        // ============================================
        const recentTransactions = await prisma.transaction.findMany({
          where: {
            deleted_at: null,
            user_id: { in: userIds.length > 0 ? userIds : [emptyUUID] }
          },
          orderBy: { created_at: 'desc' },
          take: 5,
          include: {
            User: {
              select: {
                first_name: true,
                last_name: true,
                Location: {
                  select: {
                    location_name: true
                  }
                }
              }
            },
            Transaction_detail: {
              take: 1,
              include: {
                Product: {
                  select: {
                    product_name: true
                  }
                }
              }
            }
          }
        });

        // Format recent transactions
        const formattedRecentTransactions = recentTransactions.map(t => ({
          transaction_id: t.transaction_id,
          activity: t.activity,
          status: t.status,
          created_at: t.created_at,
          first_name: t.User?.first_name || '',
          last_name: t.User?.last_name || '',
          location_name: t.User?.Location?.location_name || 'ไม่ระบุสถานที่',
          product_name: t.Transaction_detail?.[0]?.Product?.product_name || 'ไม่ระบุสินค้า',
          amount: t.Transaction_detail?.[0]?.amount || 0,
          image_path: '/placeholder.svg'
        }));

        // ============================================
        // Locker Locations (แผนที่)
        // ============================================
        const lockerLocations = await prisma.locker.findMany({
          where: {
            deleted_at: null,
            location_id: { in: locationIds.length > 0 ? locationIds : [-1] }
          },
          include: {
            Location: {
              select: {
                location_name: true,
                latitude: true,
                longitude: true
              }
            }
          }
        });

        const formattedLockerLocations = lockerLocations.map(locker => ({
          locker_id: locker.locker_id,
          locker_ip: locker.locker_location_detail || `Locker-${locker.locker_id}`,
          location_name: locker.Location?.location_name || 'ไม่ระบุ',
          latitude: locker.Location?.latitude,
          longitude: locker.Location?.longitude,
          status: locker.locker_status ? 'online' : 'offline'
        }));

        // ============================================
        // Locker Status
        // ============================================
        const lockerStatus = await prisma.locker.findMany({
          where: {
            deleted_at: null,
            location_id: { in: locationIds.length > 0 ? locationIds : [-1] }
          },
          include: {
            Location: {
              select: {
                location_name: true
              }
            }
          },
          orderBy: { locker_status: 'desc' } // Online first
        });

        const formattedLockerStatus = lockerStatus.map(locker => ({
          locker_id: locker.locker_id,
          locker_ip: locker.locker_location_detail || `Locker-${locker.locker_id}`,
          location_name: locker.Location?.location_name || 'ไม่ระบุ',
          status: locker.locker_status ? 'online' : 'offline'
        }));

        // ============================================
        // Response
        // ============================================
        console.log('✅ Dashboard stats generated for role:', user.role);

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
            offline_lockers: offlineLockers
          },
          // Transaction Chart แยกตามระยะเวลา (array format for recharts)
          transactionChart: {
            daily: dailyChartData,
            monthly: monthlyChartData,
            yearly: yearlyChartData
          },
          // Summary stats
          transactionSummary: {
            daily: {
              withdraw: todayWithdraw,
              restock: todayRestock,
              total: todayWithdraw + todayRestock
            },
            monthly: {
              withdraw: monthWithdraw,
              restock: monthRestock,
              total: monthWithdraw + monthRestock
            },
            yearly: {
              withdraw: yearWithdraw,
              restock: yearRestock,
              total: yearWithdraw + yearRestock
            }
          },
          // Transaction แยกตาม Location
          transactionsByLocation: transactionsByLocation,
          // Transaction ล่าสุด
          recentTransactions: formattedRecentTransactions,
          // Locker data
          lockerLocations: formattedLockerLocations,
          lockerStatus: formattedLockerStatus,
          // User scope info (for frontend reference)
          userScope: {
            role: user.role,
            groupLocationId: user.groupLocationId,
            locationId: user.locationId
          }
        });

      } catch (error) {
        console.error('❌ Dashboard stats error:', error);
        res.status(500).json({ 
          message: 'เกิดข้อผิดพลาด',
          error: error.message
        });
      }
    },

    // endpoint เดิมที่มีอยู่แล้ว
    countUser: async (req, res) => {
      try {
        // ✅ ตรวจสอบว่ามี req.user หรือไม่
        if (!req.user) {
          return res.status(401).json({
            message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่',
            requireLogin: true
          });
        }

        // ✅ รองรับ RBAC
        const user = {
          role: req.user.role,
          groupLocationId: req.user.groupLocationId,
          locationId: req.user.locationId
        };
        const scope = getScopeFilter(user);

        const userCount = await prisma.user.count({
          where: {
            deleted_at: null,
            ...scope.userFilter
          }
        });

        res.status(200).json({ 
          message: 'ดึงข้อมูลจำนวนผู้ใช้สำเร็จ',
          count: userCount
        });
      } catch (error) {
        console.error('Count user error:', error);
        res.status(500).json({ 
          message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
          error: error.message
        });
      }
    }
  }
};