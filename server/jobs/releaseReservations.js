// server/jobs/releaseReservations.js
const cron = require("node-cron");
const { sequelize, Order, OrderItem, ProductVariation, Payment, Sequelize } = require("../models");
const { Op } = Sequelize;

async function withPgAdvisoryLock(lockKey, fn) {
  const [row] = await sequelize.query(`SELECT pg_try_advisory_lock(${lockKey}) AS locked;`);
  const locked = row?.[0]?.locked || row?.locked;
  if (!locked) return; // có job khác đang giữ khoá → thoát
  try { await fn(); }
  finally { await sequelize.query(`SELECT pg_advisory_unlock(${lockKey});`); }
}

cron.schedule("*/2 * * * *", async () => {
  await withPgAdvisoryLock(987654321, async () => {
    const t = await sequelize.transaction();
    try {
      const expiredOrders = await Order.findAll({
        where: { status: "AWAITING_PAYMENT", reserve_expires_at: { [Op.lt]: new Date() } },
        transaction: t,
        lock: t.LOCK.UPDATE,
        skipLocked: true,
      });

      for (const order of expiredOrders) {
        const items = await OrderItem.findAll({ where: { order_id: order.order_id }, transaction: t });

        for (const it of items) {
          const v = await ProductVariation.findOne({
            where: { variation_id: it.variation_id },
            transaction: t,
            lock: t.LOCK.UPDATE,
            skipLocked: true,
          });
          if (v) await v.increment("stock_quantity", { by: it.quantity, transaction: t });
        }

        // Đánh fail payment pending của VNPAY (nếu có)
        await Payment.update(
          { payment_status: "failed" },
          {
            where: { order_id: order.order_id, provider: "VNPAY", payment_status: "pending" },
            transaction: t,
          }
        );

        order.status = "cancelled";      // ⬅️ đổi FAILED → cancelled (chữ thường)
        order.reserve_expires_at = null; // clear để job idempotent
        await order.save({ transaction: t });
      }

      await t.commit();
    } catch (e) {
      await t.rollback();
      console.error("[releaseReservations] error:", e.message);
    }
  });
});
