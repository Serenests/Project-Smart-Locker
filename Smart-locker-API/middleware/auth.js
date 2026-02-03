//Smart-locker-API/middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ตรวจสอบ Token
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        message: 'ไม่พบ Token กรุณาเข้าสู่ระบบ',
        requireLogin: true
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            message: 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่',
            requireLogin: true
          });
        }
        return res.status(403).json({ 
          message: 'Token ไม่ถูกต้อง',
          requireLogin: true
        });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
    });
  }
};

// ตรวจสอบ Role
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'กรุณาเข้าสู่ระบบ',
        requireLogin: true
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้',
        requiredRoles: allowedRoles,
        yourRole: req.user.role
      });
    }

    next();
  };
};

// Shortcuts
const requireSystemAdmin = authorizeRole(1);
const requireOrganizeAdmin = authorizeRole(1, 2);
const requireDepartmentAdmin = authorizeRole(1, 2, 3);
const requireDepartmentAdminOnly = authorizeRole(1,3);
const requireAnyUser = authorizeRole(1, 2, 3, 4);

module.exports = {
  authenticateToken,
  authorizeRole,
  requireSystemAdmin,
  requireOrganizeAdmin,
  requireDepartmentAdmin,
  requireDepartmentAdminOnly,
  requireAnyUser
};