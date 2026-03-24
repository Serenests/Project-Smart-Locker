// Smart-locker-API/utils/lockerMqttEvents.js
const { publishEvent } = require("../lib/mqttPublisher");

function toLockerId(value) {
  return String(value);
}

function topic(lockerId, resource, action) {
  return `smartlocker/${toLockerId(lockerId)}/cloud/locker/${resource}/${action}`;
}

async function publishSlotUpsert(slot) {
  const lockerId = slot.locker_id;
  const payload = {
    slot_id: slot.slot_id,
    locker_id: toLockerId(slot.locker_id),
    slot_status: slot.slot_status ?? "active",
    capacity: slot.capacity ?? 0,
    created_at: slot.created_at || null,
    updated_at: slot.updated_at || new Date().toISOString(),
    deleted_at: slot.deleted_at || null,
  };
  return publishEvent(topic(lockerId, "slot", "upsert"), payload);
}

async function publishProductUpsert(product, lockerIdList = []) {
  const payload = {
    product_id: product.product_id,
    product_name: product.product_name,
    product_detail: product.product_detail,
    created_at: product.created_at || null,
    updated_at: product.updated_at || new Date().toISOString(),
    deleted_at: product.deleted_at || null,
  };

  // product เป็น master data อาจต้องกระจายทุก locker
  return Promise.all(
    lockerIdList.map((lockerId) =>
      publishEvent(topic(lockerId, "product", "upsert"), payload),
    ),
  );
}

async function publishUserGrantUpsert(grant, user) {
  const lockerId = grant.locker_id;
  const payload = {
    User: {
      user_id: user.user_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      password: user.password, // hash จากฝั่ง server
      citizen_id: user.citizen_id, // หรือ citizen_id_encrypted ตามที่ระบบคุณใช้
      created_at: user.created_at || null,
      updated_at: user.updated_at || new Date().toISOString(),
      deleted_at: user.deleted_at || null,
    },
    permission_withdraw: grant.permission_withdraw ?? 1,
    permission_restock: grant.permission_restock ?? 0,
    updated_at: grant.updated_at || new Date().toISOString(),
    deleted_at: grant.deleted_at || null,
  };

  return publishEvent(topic(lockerId, "user-grant", "upsert"), payload);
}

async function publishQrTaskUpsert(task) {
  const payload = {
    task_id: task.task_id,
    locker_id: String(task.locker_id),
    task_type: task.task_type, // restock | dispense
    assigned_user_id: task.assigned_user_id,
    qr_token: task.qr_token,
    status: task.status || "pending",
    updated_at: task.updated_at || new Date().toISOString(),
    expires_at: task.expires_at || null,
    used_at: task.used_at || null,
    deleted_at: task.deleted_at || null,
    items: task.items || [],
  };

  return publishEvent(topic(task.locker_id, "qr-task", "upsert"), payload);
}

async function publishQrTaskCancel(task) {
  const payload = {
    task_id: task.task_id,
    locker_id: String(task.locker_id),
    task_type: task.task_type,
    assigned_user_id: task.assigned_user_id,
    updated_at: new Date().toISOString(),
    deleted_at: new Date().toISOString(),
  };

  return publishEvent(topic(task.locker_id, "qr-task", "cancel"), payload);
}

module.exports = {
  publishSlotUpsert,
  publishProductUpsert,
  publishUserGrantUpsert,
  publishQrTaskUpsert,
  publishQrTaskCancel,
};
