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
                console.log('createTransaction request body:', req.body);

                const {user_id, activity, status} = req.body;

                // ตรวจสอบข้อมูลที่จำเป็น
                if (!user_id || !activity || !status) {
                    return res.status(400).json({ 
                        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
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
                        deleted_at: null
                    }
                });


                res.status(201).json({ 
                    message: 'สร้างธุรกรรมสำเร็จ',
                    transaction: {
                        transaction_id: newTransaction.transaction_id,
                        user_id: newTransaction.user_id,
                        activity: newTransaction.activity,
                        status: newTransaction.status,
                        created_at: newTransaction.created_at
                    }
                });

            } catch (error) {
                console.error('Create product error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        //ลบ Transaction
        deleteTransaction : async (req, res) => {
            try {
                const {transaction_id} = req.body;

                if (!transaction_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ transaction_id'
                    });
                }

                // ตรวจสอบว่าธุรกรรมมีอยู่ในระบบหรือไม่
                const existingTransaction = await prisma.transaction.findUnique({
                    where: {
                        transaction_id: transaction_id
                    }
                });

                if (!existingTransaction) {
                    return res.status(404).json({ 
                        message: 'ไม่พบธุรกรรมในระบบ'
                    });
                }

                // ลบธุรกรรม
                await prisma.transaction.delete({
                    where: {
                        transaction_id: transaction_id
                    }
                });

                res.status(200).json({ 
                    message: 'ลบธุรกรรมสำเร็จ'
                });


            } catch (error) {
                console.error('Delete transaction error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        editTransaction : async (req, res) => {
            try {
                // รับค่าจาก body
                const {transaction_id, user_id, activity, status} = req.body;

                // ตรวจสอบว่ามี transaction_id หรือไม่
                if (!transaction_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ transaction_id'
                    });
                }

                // ตรวจสอบว่ามี Transaction มีอยู่ในระบบหรือไม่
                const existingTransaction = await prisma.transaction.findUnique({
                    where: {
                        transaction_id: transaction_id
                    }
                });

                if (!existingTransaction) {
                    return res.status(404).json({ 
                        message: 'ไม่พบธุรกรรมในระบบ'
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
                if (Object.keys(updateData).length === 1) { // มีแค่ updated_at
                    return res.status(400).json({ 
                        message: 'กรุณาระบุข้อมูลที่ต้องการแก้ไข'
                    });
                }

                // อัพเดทข้อมูล transaction
                const updatedTransaction = await prisma.transaction.update({
                    where: { transaction_id: transaction_id },
                    data: updateData
                })

                res.status(200).json({ 
                    message: 'แก้ไขข้อมูลธุรกรรมสำเร็จ',
                    user: updatedTransaction
                });

            } catch (error) {
                console.error('Edit transaction error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

            getAllTransactions: async (req, res) => {
                try {

                    const { search } = req.query;

                    let whereCondition = {};
                    if (search){
                        console.log('Search query:', search);
                        whereCondition = {
                            OR: [
                                { transaction_id: { contains: search, mode: 'insensitive' } },
                                { user_id: { contains: search, mode: 'insensitive' } },
                                { activity: { contains: search, mode: 'insensitive' } },
                                { status: { contains: search, mode: 'insensitive' } },
                            ]
                        };
                    }
                    
                    
                    const transactions = await prisma.transaction.findMany({
                        where: whereCondition,
                        include:{
                            User: true
                        },
                        orderBy: {
                            created_at: 'asc'
                        }
                    });

                    res.status(200).json({
                        message: 'ดึงข้อมูลธุรกรรมสำเร็จ',
                        transactions: transactions
                    });

                    const formattedTransactions = transactions.map(transaction => ({
                        transaction_id: transaction.transaction_id,
                        user_id: transaction.user_id,
                        activity: transaction.activity,
                        status: transaction.status,
                    }));

                    console.log('Formatted Transactions:', formattedTransactions);
                } catch (error) {
                    console.error('Get all transactions error:', error);
                    res.status(500).json({
                        message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                        error: error.message
                    });
                }
            },

            getTransactionById: async (req, res) => {
                try {
                    const { transaction_id } = req.params;

                    if (!transaction_id) {
                        return res.status(400).json({
                            message: 'กรุณาระบุ transaction_id'
                        });
                    }

                    const transaction = await prisma.transaction.findMany({
                        where: {
                            transaction_id: parseInt(transaction_id)
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
                                            group_location_name: true
                                        }
                                    },
                                    Location: {
                                        select: {
                                            location_name: true
                                        }
                                    },
                                    Role: {
                                        select: {
                                            role_name: true
                                        }
                                    }
                                }
                            },

                        }
                    });

                    if (!transaction) {
                        return res.status(404).json({
                            message: 'ไม่พบธุรกรรม'
                        });
                    }

                    res.status(200).json(transaction);
                    
                } catch (error) {
                    console.error('Get transaction by id error:', error);
                    res.status(500).json({
                        message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                        error: error.message
                    });
                }
            },

            // ✅ สำหรับ Role 2: ดึง Transaction ตาม group_location_id
            getTransactionsByGroup: async (req, res) => {
                try {
                    const { group_location_id, search } = req.query;

                    if (!group_location_id) {
                        return res.status(400).json({ 
                            message: 'กรุณาระบุ group_location_id' 
                        });
                    }

                    console.log('🔍 Fetching transactions for group_location_id:', group_location_id);

                    let whereCondition = {
                        User: {
                            group_location_id: parseInt(group_location_id)
                        }
                    };

                    // เพิ่มเงื่อนไขการค้นหา
                    if (search) {
                        whereCondition = {
                            User: {
                                group_location_id: parseInt(group_location_id)
                            },
                            OR: [
                                { activity: { contains: search, mode: 'insensitive' } },
                                { status: { contains: search, mode: 'insensitive' } }
                            ]
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
                                            group_location_name: true
                                        }
                                    },
                                    Location: {
                                        select: {
                                            location_id: true,
                                            location_name: true
                                        }
                                    },
                                    Role: {
                                        select: {
                                            role_id: true,
                                            role_name: true
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: {
                            created_at: 'desc'
                        }
                    });

                    console.log(`✅ Found ${transactions.length} transactions for group_location_id: ${group_location_id}`);

                    res.status(200).json({
                        message: 'ดึงข้อมูลธุรกรรมสำเร็จ',
                        transactions: transactions
                    });

                } catch (error) {
                    console.error('Get transactions by group error:', error);
                    res.status(500).json({
                        message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                        error: error.message
                    });
                }
            },

            // ✅ สำหรับ Role 3: ดึง Transaction ตาม location_id
            getTransactionsByLocation: async (req, res) => {
                try {
                    const { location_id, search } = req.query;

                    if (!location_id) {
                        return res.status(400).json({ 
                            message: 'กรุณาระบุ location_id' 
                        });
                    }

                    console.log('🔍 Fetching transactions for location_id:', location_id);

                    let whereCondition = {
                        User: {
                            location_id: parseInt(location_id)
                        }
                    };

                    // เพิ่มเงื่อนไขการค้นหา
                    if (search) {
                        whereCondition = {
                            User: {
                                location_id: parseInt(location_id)
                            },
                            OR: [
                                { activity: { contains: search, mode: 'insensitive' } },
                                { status: { contains: search, mode: 'insensitive' } }
                            ]
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
                                            group_location_name: true
                                        }
                                    },
                                    Location: {
                                        select: {
                                            location_id: true,
                                            location_name: true
                                        }
                                    },
                                    Role: {
                                        select: {
                                            role_id: true,
                                            role_name: true
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: {
                            created_at: 'desc'
                        }
                    });

                    console.log(`✅ Found ${transactions.length} transactions for location_id: ${location_id}`);

                    res.status(200).json({
                        message: 'ดึงข้อมูลธุรกรรมสำเร็จ',
                        transactions: transactions
                    });

                } catch (error) {
                    console.error('Get transactions by location error:', error);
                    res.status(500).json({
                        message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                        error: error.message
                    });
                }
            },

            // ✅ สำหรับออกใบรีพอร์ต - ดึงข้อมูลสรุปการเบิก-เติมยา
            getReportData: async (req, res) => {
                try {
                    const { location_id, group_location_id, start_date, end_date } = req.query;

                    // ตรวจสอบข้อมูลที่จำเป็น
                    if (!start_date || !end_date) {
                        return res.status(400).json({
                            message: 'กรุณาระบุช่วงเวลา (start_date และ end_date)'
                        });
                    }

                    // ตรวจสอบว่าต้องมี location_id หรือ group_location_id อย่างน้อยหนึ่งอย่าง
                    if (!location_id && !group_location_id) {
                        return res.status(400).json({
                            message: 'กรุณาระบุ location_id หรือ group_location_id'
                        });
                    }

                    console.log('📊 Generating report:', { location_id, group_location_id, start_date, end_date });

                    // แปลงวันที่
                    const startDateTime = new Date(start_date);
                    startDateTime.setHours(0, 0, 0, 0);
                    
                    const endDateTime = new Date(end_date);
                    endDateTime.setHours(23, 59, 59, 999);

                    // สร้าง where condition สำหรับ Transaction
                    let transactionWhereCondition = {
                        status: 'สำเร็จ',
                        created_at: {
                            gte: startDateTime,
                            lte: endDateTime
                        }
                    };

                    // เพิ่มเงื่อนไขตาม location หรือ group
                    if (location_id) {
                        transactionWhereCondition.User = {
                            location_id: parseInt(location_id)
                        };
                    } else if (group_location_id) {
                        transactionWhereCondition.User = {
                            group_location_id: parseInt(group_location_id)
                        };
                    }

                    // ดึงข้อมูล Transaction พร้อม Transaction_detail
                    const transactions = await prisma.transaction.findMany({
                        where: transactionWhereCondition,
                        include: {
                            Transaction_detail: {
                                include: {
                                    Product: true
                                }
                            },
                            User: {
                                include: {
                                    Location: {
                                        include: {
                                            Group_Location: true
                                        }
                                    }
                                }
                            }
                        }
                    });

                    console.log(`📦 Found ${transactions.length} transactions`);

                    // Aggregate ข้อมูลตาม product
                    const productMap = new Map();

                    for (const transaction of transactions) {
                        for (const detail of transaction.Transaction_detail) {
                            const productId = detail.product_id;
                            
                            if (!productMap.has(productId)) {
                                productMap.set(productId, {
                                    product_id: productId,
                                    product_name: detail.Product?.product_name || 'ไม่ระบุ',
                                    total_restock: 0,
                                    total_withdraw: 0,
                                    current_stock: 0
                                });
                            }

                            const productData = productMap.get(productId);

                            if (transaction.activity === 'เติมยา') {
                                productData.total_restock += detail.amount || 0;
                            } else if (transaction.activity === 'เบิกยา') {
                                productData.total_withdraw += detail.amount || 0;
                            }
                        }
                    }

                    // ดึง current stock สำหรับแต่ละ product
                    let slotStockWhereCondition = {};
                    
                    if (location_id) {
                        slotStockWhereCondition = {
                            Slot: {
                                location_id: parseInt(location_id)
                            }
                        };
                    } else if (group_location_id) {
                        slotStockWhereCondition = {
                            Slot: {
                                Location: {
                                    group_location_id: parseInt(group_location_id)
                                }
                            }
                        };
                    }

                    // ดึง current stock
                    const slotStocks = await prisma.slot_stock.findMany({
                        where: slotStockWhereCondition,
                        select: {
                            product_id: true,
                            amount: true
                        }
                    });

                    // Aggregate current stock by product
                    const stockByProduct = new Map();
                    for (const stock of slotStocks) {
                        const currentAmount = stockByProduct.get(stock.product_id) || 0;
                        stockByProduct.set(stock.product_id, currentAmount + (stock.amount || 0));
                    }

                    // Update current_stock ใน productMap
                    for (const [productId, productData] of productMap) {
                        productData.current_stock = stockByProduct.get(productId) || 0;
                    }

                    // เพิ่ม products ที่มี stock แต่ไม่มี transaction ในช่วงเวลานี้
                    for (const [productId, stockAmount] of stockByProduct) {
                        if (!productMap.has(productId)) {
                            // ดึงชื่อ product
                            const product = await prisma.product.findUnique({
                                where: { product_id: productId }
                            });

                            productMap.set(productId, {
                                product_id: productId,
                                product_name: product?.product_name || 'ไม่ระบุ',
                                total_restock: 0,
                                total_withdraw: 0,
                                current_stock: stockAmount
                            });
                        }
                    }

                    // แปลง Map เป็น Array
                    const items = Array.from(productMap.values());

                    // คำนวณ Summary
                    const summary = {
                        total_products: items.length,
                        total_restock_all: items.reduce((sum, item) => sum + item.total_restock, 0),
                        total_withdraw_all: items.reduce((sum, item) => sum + item.total_withdraw, 0),
                        total_current_stock: items.reduce((sum, item) => sum + item.current_stock, 0)
                    };

                    // ดึงข้อมูล Location
                    let locationInfo = {
                        location_name: 'ทั้งหมด',
                        group_location_name: 'ทั้งหมด'
                    };

                    if (location_id) {
                        const location = await prisma.location.findUnique({
                            where: { location_id: parseInt(location_id) },
                            include: { Group_Location: true }
                        });
                        if (location) {
                            locationInfo.location_name = location.location_name || 'ไม่ระบุ';
                            locationInfo.group_location_name = location.Group_Location?.group_location_name || 'ไม่ระบุ';
                        }
                    } else if (group_location_id) {
                        const groupLocation = await prisma.group_Location.findUnique({
                            where: { group_location_id: parseInt(group_location_id) }
                        });
                        if (groupLocation) {
                            locationInfo.location_name = 'ทุกสถานที่ในกลุ่ม';
                            locationInfo.group_location_name = groupLocation.group_location_name || 'ไม่ระบุ';
                        }
                    }

                    console.log(`✅ Report generated with ${items.length} products`);

                    res.status(200).json({
                        message: 'ดึงข้อมูลรีพอร์ตสำเร็จ',
                        report: {
                            location_name: locationInfo.location_name,
                            group_location_name: locationInfo.group_location_name,
                            start_date: start_date,
                            end_date: end_date,
                            generated_at: new Date().toISOString(),
                            items: items,
                            summary: summary
                        }
                    });

                } catch (error) {
                    console.error('Get report data error:', error);
                    res.status(500).json({
                        message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                        error: error.message
                    });
                }
            },
        }
};