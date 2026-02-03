// controllers/TransactionDetailController.js
const { PrismaClient } = require('@prisma/client');
const { create } = require('domain');
const { get } = require('http');
require('dotenv').config();

const prisma = require('../lib/prisma');

module.exports = {
    TransactionDetailController: {

        // ========================================
        // 1. เพิ่มรายการยาในตะกร้า (addItemToCart)
        // ========================================
        addItemToCart: async (req, res) => {
            try {
                const { transaction_id, product_id, lot_id, slot_id, amount, expired_at } = req.body;

                // ตรวจสอบข้อมูลที่จำเป็น
                if (!transaction_id || !product_id || !lot_id || !slot_id || !amount) {
                    return res.status(400).json({ 
                        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (transaction_id, product_id, lot_id, slot_id, amount)'
                    });
                }

                // ตรวจสอบว่า transaction มีอยู่จริงและยังไม่สำเร็จ
                const transaction = await prisma.transaction.findUnique({
                    where: { transaction_id: parseInt(transaction_id) }
                });

                if (!transaction) {
                    return res.status(404).json({ 
                        message: 'ไม่พบรายการธุรกรรม'
                    });
                }

                if (transaction.status === 'สำเร็จ') {
                    return res.status(400).json({ 
                        message: 'ไม่สามารถแก้ไขรายการที่สำเร็จแล้ว'
                    });
                }

                // ดึงข้อมูล slot เพื่อเช็ค capacity
                const slot = await prisma.slot.findUnique({
                    where: { slot_id: parseInt(slot_id) }
                });

                if (!slot) {
                    return res.status(404).json({ 
                        message: 'ไม่พบช่องที่ระบุ'
                    });
                }

                // ตรวจสอบว่า product_id มีอยู่จริง
                const product = await prisma.product.findUnique({
                    where: { product_id: product_id }
                });

                if (!product) {
                    return res.status(404).json({ 
                        message: 'ไม่พบสินค้าที่ระบุ'
                    });
                }

                // ========================================
                // ตรวจสอบว่ามี slot_stock ของ lot และ product นี้อยู่แล้วหรือไม่
                // ========================================
                let slotStock = await prisma.slot_stock.findFirst({
                    where: {
                        lot_id: lot_id,
                        product_id: product_id,
                        slot_id: parseInt(slot_id)
                    }
                });

                let slot_stock_id;
                let actionTaken = '';
                let isNewSlotStock = false;

                if (slotStock) {
                    // ========================================
                    // กรณีมี slot_stock อยู่แล้ว → UPDATE
                    // ========================================

                    if (transaction.activity === 'เติมยา') {
                        // เติมยา: เพิ่มจำนวน
                        const newTotalAmount = slotStock.amount + parseInt(amount);

                        // ตรวจสอบไม่เกิน capacity
                        if (newTotalAmount > slot.capacity) {
                            return res.status(400).json({
                                message: `ช่องนี้มีความจุ ${slot.capacity} ชิ้น ปัจจุบันมี ${slotStock.amount} ชิ้น ไม่สามารถเพิ่มอีก ${amount} ชิ้นได้`
                            });
                        }

                        // UPDATE จำนวนใน slot_stock
                        slotStock = await prisma.slot_stock.update({
                            where: { slot_stock_id: slotStock.slot_stock_id },
                            data: {
                                amount: newTotalAmount,
                                updated_at: new Date()
                            }
                        });

                        slot_stock_id = slotStock.slot_stock_id;
                        actionTaken = 'อัพเดท slot_stock (เติมยา)';
                    }
                    else if (transaction.activity === 'เบิกยา') {
                        // เบิกยา: ลดจำนวน
                        const newTotalAmount = slotStock.amount - parseInt(amount);

                        if (newTotalAmount < 0) {
                            return res.status(400).json({
                                message: `ไม่สามารถเบิกจำนวนได้มากกว่าที่มีอยู่ในช่อง (มี ${slotStock.amount} ชิ้น)`
                            });
                        }

                        // UPDATE จำนวนใน slot_stock
                        slotStock = await prisma.slot_stock.update({
                            where: { slot_stock_id: slotStock.slot_stock_id },
                            data: {
                                amount: newTotalAmount,
                                updated_at: new Date()
                            }
                        });

                        slot_stock_id = slotStock.slot_stock_id;
                        actionTaken = 'อัพเดท slot_stock (เบิกยา)';
                    }
                } else {
                    // ========================================
                    // กรณีไม่มี slot_stock → INSERT ใหม่
                    // ========================================

                    // ถ้าเป็นการเบิกยา แต่ไม่มี slot_stock = ไม่สามารถเบิกได้
                    if (transaction.activity === 'เบิกยา') {
                        return res.status(400).json({
                            message: 'ไม่พบสินค้าในช่องนี้ ไม่สามารถเบิกได้'
                        });
                    }

                    // ตรวจสอบจำนวนที่มีอยู่ในช่องนี้แล้ว (สินค้าอื่นๆ)
                    const existingStock = await prisma.slot_stock.aggregate({
                        where: { slot_id: parseInt(slot_id) },
                        _sum: { amount: true }
                    });

                    const currentAmount = existingStock._sum.amount || 0;
                    const totalAmount = currentAmount + parseInt(amount);

                    // ตรวจสอบไม่เกิน capacity
                    if (totalAmount > slot.capacity) {
                        return res.status(400).json({
                            message: `ช่องนี้มีความจุ ${slot.capacity} ชิ้น ปัจจุบันมีสินค้า ${currentAmount} ชิ้น ไม่สามารถเพิ่มอีก ${amount} ชิ้นได้`
                        });
                    }

                    // ตรวจสอบ expired_at (ถ้าเป็นการเติมยา)
                    if (transaction.activity === 'เติมยา' && !expired_at) {
                        return res.status(400).json({
                            message: 'กรุณาระบุวันหมดอายุ (expired_at) สำหรับการเติมยา'
                        });
                    }

                    // CREATE slot_stock ใหม่ (กรณีเติมยา)
                    slotStock = await prisma.slot_stock.create({
                        data: {
                            lot_id: lot_id,
                            product_id: product_id,
                            slot_id: parseInt(slot_id),
                            amount: parseInt(amount),
                            expired_at: expired_at ? new Date(expired_at) : null,
                            created_at: new Date()
                        }
                    });

                    slot_stock_id = slotStock.slot_stock_id;
                    actionTaken = 'สร้าง slot_stock ใหม่';
                    isNewSlotStock = true;
                }
                res.status(201).json({ 
                    message: 'เพิ่มรายการยาชั่วคราวสำเร็จ (รอการยืนยัน)',
                    data: {
                        transaction_id: transaction_id,
                        slot_stock_id: slot_stock_id,
                        product_id: product_id,
                        lot_id: lot_id,
                        slot_id: slot_id,
                        amount: parseInt(amount),
                        currentSlotStockAmount: slotStock.amount,
                        action: actionTaken,
                        was_created: isNewSlotStock
                    }
                });

            } catch (error) {
                console.error('Add item to cart error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        // ========================================
        // 2. ดูรายการยาที่เพิ่มไว้ชั่วคราว (getTempCartItems)
        // ========================================
        getTempCartItems: async (req, res) => {
            try {
                const { transaction_id } = req.query;

                if (!transaction_id) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ transaction_id'
                    });
                }

                // ดึงข้อมูล transaction พร้อม slot_stock ที่ถูกสร้าง/อัพเดท
                const transaction = await prisma.transaction.findUnique({
                    where: { transaction_id: parseInt(transaction_id) },
                    include: {
                        User: {
                            select: {
                                user_id: true,
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                });

                if (!transaction) {
                    return res.status(404).json({ 
                        message: 'ไม่พบรายการธุรกรรม'
                    });
                }

                res.status(200).json({
                    message: 'ดึงข้อมูล transaction สำเร็จ',
                    transaction: transaction,
                    note: 'ยังไม่ยืนยันรายการ (ยังไม่มี transaction_detail)'
                });

            } catch (error) {
                console.error('Get temp cart items error:', error);
                res.status(500).json({ 
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        // ========================================
        // 3. ยืนยันการทำรายการ (confirmTransaction)
        // ========================================
        confirmTransaction: async (req, res) => {
            try {
                const { transaction_id, items } = req.body;

                if (!transaction_id || !items || !Array.isArray(items) || items.length === 0) {
                    return res.status(400).json({ 
                        message: 'กรุณาระบุ transaction_id และรายการยา (items) ที่ต้องการยืนยัน',
                        example: {
                            transaction_id: "1",
                            items: [
                                {
                                    slot_stock_id: 1,
                                    product_id: "PROD001",
                                    slot_id: 1,
                                    amount: 5
                                }
                            ]
                        }
                    });
                }

                // ใช้ transaction เพื่อความปลอดภัย
                const result = await prisma.$transaction(async (tx) => {
                    // 1. ตรวจสอบ transaction
                    const transaction = await tx.transaction.findUnique({
                        where: { transaction_id: parseInt(transaction_id) }
                    });

                    if (!transaction) {
                        throw new Error('ไม่พบรายการธุรกรรม');
                    }

                    if (transaction.status === 'สำเร็จ') {
                        throw new Error('รายการนี้ยืนยันไปแล้ว');
                    }

                    // 2. สร้าง transaction_detail สำหรับแต่ละรายการ
                    const createdDetails = [];

                    for (const item of items) {
                        // ตรวจสอบว่า slot_stock มีอยู่จริง
                        const slotStock = await tx.slot_stock.findUnique({
                            where: { slot_stock_id: parseInt(item.slot_stock_id) }
                        });

                        if (!slotStock) {
                            throw new Error(`ไม่พบ slot_stock_id: ${item.slot_stock_id}`);
                        }

                        // สร้าง transaction_detail
                        const detail = await tx.transaction_detail.create({
                            data: {
                                transaction_id: parseInt(transaction_id),
                                product_id: item.product_id,
                                slot_stock_id: parseInt(item.slot_stock_id),
                                slot_id: parseInt(item.slot_id),
                                amount: parseInt(item.amount),
                                created_at: new Date()
                            }
                        });

                        createdDetails.push(detail);
                    }

                    // 3. อัพเดท status ของ transaction เป็น "สำเร็จ"
                    const updatedTransaction = await tx.transaction.update({
                        where: { transaction_id: parseInt(transaction_id) },
                        data: { 
                            status: 'สำเร็จ',
                            updated_at: new Date()
                        }
                    });

                    return {
                        transaction: updatedTransaction,
                        details: createdDetails
                    };
                });

                res.status(200).json({ 
                    message: 'ยืนยันรายการสำเร็จ',
                    data: result
                });

            } catch (error) {
                console.error('Confirm transaction error:', error);
                res.status(500).json({ 
                    message: error.message || 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        // ========================================
        // 4. ยกเลิกการทำรายการ (cancelTransaction)
        // ========================================
        cancelTransaction: async (req, res) => {
            try {
                const { transaction_id, rollback_items } = req.body;

                // 1. Validate input
                if (!transaction_id) {
                    return res.status(400).json({ 
                        success: false,
                        message: 'กรุณาระบุ transaction_id'
                    });
                }

                // 2. ตรวจสอบ transaction ก่อนทำ rollback
                const transaction = await prisma.transaction.findUnique({
                    where: { transaction_id: parseInt(transaction_id) }
                });

                if (!transaction) {
                    return res.status(404).json({ 
                        success: false,
                        message: 'ไม่พบรายการธุรกรรม'
                    });
                }

                if (transaction.status === 'สำเร็จ') {
                    return res.status(400).json({ 
                        success: false,
                        message: 'ไม่สามารถยกเลิกรายการที่สำเร็จแล้ว'
                    });
                }

                // 3. ทำ rollback
                await prisma.$transaction(async (tx) => {
                    if (rollback_items && Array.isArray(rollback_items)) {
                        for (const item of rollback_items) {
                            try {
                                const slotStock = await tx.slot_stock.findUnique({
                                    where: { slot_stock_id: parseInt(item.slot_stock_id) }
                                });

                                if (!slotStock) {
                                    console.warn(`Slot stock ${item.slot_stock_id} not found`);
                                    continue;
                                }

                                // ถ้าเป็น slot_stock ที่สร้างใหม่ในรอบนี้ ให้ลบทิ้ง
                                if (item.was_created) {
                                    await tx.slot_stock.delete({
                                        where: { slot_stock_id: parseInt(item.slot_stock_id) }
                                    });
                                }
                                // ถ้าไม่ได้สร้างใหม่ ต้อง rollback จำนวนกลับไป
                                else {
                                    let newAmount;

                                    // กรณี ยกเลิก 'เบิกยา' = ต้องเพิ่มจำนวนกลับเข้าไป (เพราะเวลาเบิกมันลด)
                                    if (transaction.activity === 'เบิกยา') {
                                        newAmount = slotStock.amount + parseInt(item.amount_to_rollback);

                                        await tx.slot_stock.update({
                                            where: { slot_stock_id: parseInt(item.slot_stock_id) },
                                            data: {
                                                amount: newAmount,
                                                updated_at: new Date()
                                            }
                                        });
                                    }
                                    // กรณี ยกเลิก 'เติมยา' = ต้องลดจำนวนกลับไป (เพราะเวลาเติมมันเพิ่ม)
                                    else if (transaction.activity === 'เติมยา') {
                                        newAmount = slotStock.amount - parseInt(item.amount_to_rollback);

                                        // ถ้าลดแล้วเหลือ 0 หรือติดลบ ให้ลบ slot_stock ทิ้ง
                                        if (newAmount <= 0) {
                                            await tx.slot_stock.delete({
                                                where: { slot_stock_id: parseInt(item.slot_stock_id) }
                                            });
                                        } else {
                                            await tx.slot_stock.update({
                                                where: { slot_stock_id: parseInt(item.slot_stock_id) },
                                                data: {
                                                    amount: newAmount,
                                                    updated_at: new Date()
                                                }
                                            });
                                        }
                                    }
                                }
                            } catch (itemError) {
                                console.error(`Error processing item:`, itemError);
                                throw itemError;
                            }
                        }
                    }

                    await tx.transaction.delete({
                        where: { transaction_id: parseInt(transaction_id) }
                    });
                });

                // 4. ส่ง response - เพิ่ม return!
                return res.status(200).json({ 
                    success: true,
                    message: 'ยกเลิกรายการและ rollback slot_stock สำเร็จ',
                    transaction_id: parseInt(transaction_id)
                });

            } catch (error) {
                console.error('Cancel transaction error:', error);
                
                // 5. Error handling - เช็ค headersSent
                if (!res.headersSent) {
                    return res.status(500).json({ 
                        success: false,
                        message: error.message || 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                        error: process.env.NODE_ENV === 'development' ? error.message : undefined
                    });
                }
            }
        },

        // ========================================
        // 5. ลบรายการยาออกจากตะกร้าชั่วคราว (removeItemFromTempCart)
        // ========================================
        removeItemFromTempCart: async (req, res) => {
            try {
                const { slot_stock_id, amount_to_remove, transaction_id, was_created } = req.body;

                if (!slot_stock_id || !amount_to_remove || !transaction_id) {
                    return res.status(400).json({
                        message: 'กรุณาระบุ slot_stock_id, amount_to_remove และ transaction_id'
                    });
                }

                // ดึงข้อมูล transaction เพื่อดู activity
                const transaction = await prisma.transaction.findUnique({
                    where: { transaction_id: parseInt(transaction_id) }
                });

                if (!transaction) {
                    return res.status(404).json({
                        message: 'ไม่พบรายการธุรกรรม'
                    });
                }

                const slotStock = await prisma.slot_stock.findUnique({
                    where: { slot_stock_id: parseInt(slot_stock_id) }
                });

                if (!slotStock) {
                    return res.status(404).json({
                        message: 'ไม่พบ slot_stock ที่ระบุ'
                    });
                }

                // ถ้าเป็นรายการที่สร้างใหม่ → ลบทิ้ง
                if (was_created === true || was_created === 'true') {
                    await prisma.slot_stock.delete({
                        where: { slot_stock_id: parseInt(slot_stock_id) }
                    });

                    return res.status(200).json({
                        message: 'ลบรายการออกจากตะกร้าสำเร็จ (ลบ slot_stock)',
                        action: 'deleted'
                    });
                }

                // ถ้าเป็นรายการที่อัพเดท → ต้อง rollback ตาม activity
                let newAmount;

                if (transaction.activity === 'เบิกยา') {
                    // ลบรายการเบิกยา = ต้องเพิ่มจำนวนกลับ (เพราะตอนเบิกมันลด)
                    newAmount = slotStock.amount + parseInt(amount_to_remove);

                    await prisma.slot_stock.update({
                        where: { slot_stock_id: parseInt(slot_stock_id) },
                        data: {
                            amount: newAmount,
                            updated_at: new Date()
                        }
                    });

                    return res.status(200).json({
                        message: 'ลบรายการออกจากตะกร้าสำเร็จ (เพิ่มจำนวนกลับ)',
                        action: 'updated',
                        activity: 'เบิกยา',
                        newAmount: newAmount
                    });
                } else if (transaction.activity === 'เติมยา') {
                    // ลบรายการเติมยา = ต้องลดจำนวนกลับ (เพราะตอนเติมมันเพิ่ม)
                    newAmount = slotStock.amount - parseInt(amount_to_remove);

                    if (newAmount <= 0) {
                        await prisma.slot_stock.delete({
                            where: { slot_stock_id: parseInt(slot_stock_id) }
                        });

                        return res.status(200).json({
                            message: 'ลบรายการออกจากตะกร้าสำเร็จ (ลบ slot_stock เพราะเหลือ 0)',
                            action: 'deleted',
                            activity: 'เติมยา'
                        });
                    } else {
                        await prisma.slot_stock.update({
                            where: { slot_stock_id: parseInt(slot_stock_id) },
                            data: {
                                amount: newAmount,
                                updated_at: new Date()
                            }
                        });

                        return res.status(200).json({
                            message: 'ลบรายการออกจากตะกร้าสำเร็จ (ลดจำนวนกลับ)',
                            action: 'updated',
                            activity: 'เติมยา',
                            newAmount: newAmount
                        });
                    }
                }

            } catch (error) {
                console.error('Remove item from temp cart error:', error);
                res.status(500).json({
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        // ========================================
        // 6. ดูรายละเอียด transaction_detail ทั้งหมด (getAllTransactionDetails)
        // ========================================
        getAllTransactionDetails: async (req, res) => {
            try {
                const { transaction_id } = req.query;

                let whereCondition = {};
                if (transaction_id) {
                    whereCondition.transaction_id = parseInt(transaction_id);
                }

                const details = await prisma.transaction_detail.findMany({
                    where: whereCondition,
                    include: {
                        Transaction: true,
                        Product: true,
                        Slot_stock: {
                            include: {
                                Slot: true
                            }
                        },
                        Slot: true
                    },
                    orderBy: {
                        created_at: 'desc'
                    }
                });

                res.status(200).json({
                    message: 'ดึงข้อมูลรายละเอียดธุรกรรมสำเร็จ',
                    count: details.length,
                    details: details
                });

            } catch (error) {
                console.error('Get all transaction details error:', error);
                res.status(500).json({
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        },

        getTransactionDetailByTransactionId: async (req, res) => {
            try {
                const { transaction_id } = req.params;

                if (!transaction_id) {
                    return res.status(400).json({
                        message: 'กรุณาระบุ transaction_id'
                    });
                }

                // ดึงข้อมูล transaction พร้อมกับ transaction_details
                const transaction = await prisma.Transaction_detail.findMany({
                    where: {
                        transaction_id: parseInt(transaction_id)
                    },
                    include: {
                        Transaction:{
                            select:{
                                user_id: true,
                                transaction_id: true,
                                activity: true,
                                status: true,
                                User:{
                                    select:{
                                        first_name: true,
                                        last_name: true,
                                        Location:{
                                            select:{
                                                location_name: true,
                                                Group_Location:{
                                                    select:{
                                                        group_location_name: true
                                                    }
                                                }
                                            }
                                        },
                                        
                                    }
                                    
                                }
                            }
                        },
                        Product:{
                            select:{
                                product_id: true,
                                product_name: true,
                            }
                        },
                        Slot_stock:{
                            select:{
                                slot_id: true,
                                lot_id: true,
                                amount: true,
                            }
                        },
                        Slot:{
                            select:{
                                slot_id: true,
                                locker_id: true,
                                capacity: true,
                                Locker:{
                                    select:{
                                        locker_id: true,
                                        locker_location_detail: true,
                                        Location:{
                                            select:{
                                                location_name: true,
                                                Group_Location:{
                                                    select:{
                                                        group_location_name: true
                                                    }
                                                }
                                            }
                                        }
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
                console.error('Get transaction details error:', error);
                res.status(500).json({
                    message: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์',
                    error: error.message
                });
            }
        }
    }
};