// smart-locker/lib/auth.js
// ไฟล์สำหรับจัดการ Token และ User Info

import axios from 'axios';

// =====================================================
// 1. Auth Service - จัดการ Token และ User Data
// =====================================================
export const authService = {
  // เก็บ token
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  },

  // ดึง token
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },

  // เก็บข้อมูล user
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },

  // ดึงข้อมูล user
  getUser: () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  // ลบทั้งหมด (logout)
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // ตรวจสอบว่ามี token หรือไม่
  isAuthenticated: () => {
    return !!authService.getToken();
  },

  // ดึง role ของ user
  getUserRole: () => {
    const user = authService.getUser();
    return user?.role || null;
  },

  // ตรวจสอบ role (รับ array ของ role ที่อนุญาต)
  hasRole: (allowedRoles) => {
    const userRole = authService.getUserRole();
    return allowedRoles.includes(userRole);
  },

  // ดึง groupLocationId
  getGroupLocationId: () => {
    const user = authService.getUser();
    return user?.groupLocationId || null;
  },

  // ดึง locationId
  getLocationId: () => {
    const user = authService.getUser();
    return user?.locationId || null;
  }
};

// =====================================================
// 2. API Client - Axios Instance with Auto Token
// =====================================================
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor - แนบ token ทุก request อัตโนมัติ
apiClient.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - จัดการ error
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // ถ้า token หมดอายุหรือไม่ถูกต้อง (401)
    if (error.response?.status === 401) {
      console.log('❌ Token expired or invalid - clearing auth and redirecting to login');
      
      // ลบ token และ user data
      authService.clearAuth();
      
      // Redirect ไป login (ถ้าไม่ใช่หน้า signin อยู่แล้ว)
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/signin')) {
        window.location.href = '/signin';
      }
    }
    
    return Promise.reject(error);
  }
);

// =====================================================
// 3. Helper Functions
// =====================================================

// ตรวจสอบ role และ redirect ถ้าไม่มีสิทธิ์
export const requireAuth = (allowedRoles = []) => {
  if (typeof window === 'undefined') return true; // SSR
  
  const isAuth = authService.isAuthenticated();
  
  if (!isAuth) {
    window.location.href = '/signin';
    return false;
  }
  
  if (allowedRoles.length > 0 && !authService.hasRole(allowedRoles)) {
    alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
    window.location.href = '/dashboard';
    return false;
  }
  
  return true;
};

// ฟังก์ชัน logout
export const logout = () => {
  authService.clearAuth();
  window.location.href = '/signin';
};