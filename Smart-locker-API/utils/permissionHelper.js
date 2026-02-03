// Smart-locker-API/utils/permissionHelper.js
// Helper functions สำหรับตรวจสอบ permissions

/**
 * ตรวจสอบว่า requester มีสิทธิ์จัดการ target user หรือไม่
 * @param {Object} requester - ผู้ขอทำรายการ (จาก req.user)
 * @param {Object} targetUser - User ที่ต้องการจัดการ
 * @returns {Object} { allowed: boolean, reason: string }
 */
const canManageUser = (requester, targetUser) => {
    // 1. System Admin (role=1) ทำได้หมด
    if (requester.role === 1) {
        return { allowed: true, reason: 'System Admin has full access' };
    }

    // 2. Organize Admin (role=2)
    if (requester.role === 2) {
        // ต้องอยู่ใน group_location_id เดียวกัน
        if (requester.groupLocationId !== targetUser.group_location_id) {
            return { 
                allowed: false, 
                reason: 'คุณสามารถจัดการเฉพาะผู้ใช้ในกลุ่มสถานที่เดียวกันเท่านั้น' 
            };
        }
        
        // จัดการได้เฉพาะ Department Admin (3) และ User (4)
        if (targetUser.role_id === 1) {
            return { 
                allowed: false, 
                reason: 'คุณไม่สามารถจัดการ System Admin ได้' 
            };
        }
        
        if (targetUser.role_id === 2) {
            return { 
                allowed: false, 
                reason: 'คุณไม่สามารถจัดการ Organize Admin คนอื่นได้' 
            };
        }
        
        // OK: target เป็น Department Admin (3) หรือ User (4)
        return { allowed: true, reason: 'Allowed' };
    }

    // 3. Department Admin (role=3)
    if (requester.role === 3) {
        // ต้องอยู่ใน location_id เดียวกัน
        if (requester.locationId !== targetUser.location_id) {
            return { 
                allowed: false, 
                reason: 'คุณสามารถจัดการเฉพาะผู้ใช้ในสถานที่เดียวกันเท่านั้น' 
            };
        }
        
        // จัดการได้เฉพาะ User (4)
        if (targetUser.role_id !== 4) {
            return { 
                allowed: false, 
                reason: 'คุณสามารถจัดการเฉพาะ User ทั่วไปเท่านั้น' 
            };
        }
        
        return { allowed: true, reason: 'Allowed' };
    }

    // 4. User (role=4) - ไม่มีสิทธิ์จัดการใครเลย (นอกจากตัวเอง)
    if (requester.role === 4) {
        // อนุญาตเฉพาะแก้ไขตัวเอง
        if (requester.userId === targetUser.user_id) {
            return { allowed: true, reason: 'Can edit own profile' };
        }
        
        return { 
            allowed: false, 
            reason: 'คุณไม่มีสิทธิ์จัดการผู้ใช้อื่น' 
        };
    }

    return { allowed: false, reason: 'Invalid role' };
};

/**
 * ตรวจสอบว่า requester มีสิทธิ์สร้าง user ด้วย role ที่ระบุหรือไม่
 * @param {Object} requester - ผู้ขอทำรายการ (จาก req.user)
 * @param {number} newUserRole - Role ที่ต้องการสร้าง
 * @returns {Object} { allowed: boolean, reason: string }
 */
const canCreateUserWithRole = (requester, newUserRole) => {
    // 1. System Admin (role=1) สร้างได้หมด
    if (requester.role === 1) {
        return { allowed: true, reason: 'System Admin has full access' };
    }

    // 2. Organize Admin (role=2)
    if (requester.role === 2) {
        // สร้างได้เฉพาะ Department Admin (3) และ User (4)
        if (newUserRole === 1 || newUserRole === 2) {
            return { 
                allowed: false, 
                reason: 'คุณไม่สามารถสร้าง System Admin หรือ Organize Admin ได้' 
            };
        }
        return { allowed: true, reason: 'Allowed' };
    }

    // 3. Department Admin (role=3)
    if (requester.role === 3) {
        // สร้างได้เฉพาะ User (4)
        if (newUserRole !== 4) {
            return { 
                allowed: false, 
                reason: 'คุณสามารถสร้างเฉพาะ User ทั่วไปเท่านั้น' 
            };
        }
        return { allowed: true, reason: 'Allowed' };
    }

    // 4. User (role=4) - ไม่มีสิทธิ์สร้างใครเลย
    return { 
        allowed: false, 
        reason: 'คุณไม่มีสิทธิ์สร้างผู้ใช้ใหม่' 
    };
};

/**
 * สร้าง WHERE clause สำหรับ filter users ตาม scope
 * @param {Object} requester - ผู้ขอทำรายการ (จาก req.user)
 * @returns {Object} Prisma where clause
 */
const getUserFilterScope = (requester) => {
    // 1. System Admin (role=1) - เห็นทุกคน
    if (requester.role === 1) {
        return {}; // ไม่มี filter
    }

    // 2. Organize Admin (role=2) - เห็นเฉพาะ group_location_id เดียวกัน
    // และเฉพาะ Department Admin (3) + User (4)
    if (requester.role === 2) {
        return {
            group_location_id: requester.groupLocationId,
            role_id: {
                in: [3, 4] // Department Admin และ User
            }
        };
    }

    // 3. Department Admin (role=3) - เห็นเฉพาะ location_id เดียวกัน
    // และเฉพาะ User (4)
    if (requester.role === 3) {
        return {
            location_id: requester.locationId,
            role_id: 4 // เฉพาะ User
        };
    }

    // 4. User (role=4) - เห็นเฉพาะตัวเอง
    if (requester.role === 4) {
        return {
            user_id: requester.userId
        };
    }

    // Default: ไม่เห็นใคร
    return {
        user_id: 'impossible-id' // จะไม่เจอใคร
    };
};



module.exports = {
    canManageUser,
    canCreateUserWithRole,
    getUserFilterScope
};