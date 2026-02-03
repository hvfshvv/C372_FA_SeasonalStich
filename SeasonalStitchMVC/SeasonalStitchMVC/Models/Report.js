const db = require('../db');

const Report = {
    getSalesSummary: (range, callback) => {
        const sql = `
            SELECT
                COUNT(*) AS total_orders,
                COALESCE(SUM(total), 0) AS total_revenue,
                COALESCE(AVG(total), 0) AS avg_order_value
            FROM orders
            WHERE created_at BETWEEN ? AND ?
        `;
        db.query(sql, [range.start, range.end], callback);
    },

    getStatusBreakdown: (range, callback) => {
        const sql = `
            SELECT status, COUNT(*) AS count
            FROM orders
            WHERE created_at BETWEEN ? AND ?
            GROUP BY status
        `;
        db.query(sql, [range.start, range.end], callback);
    },

    getDailySales: (range, callback) => {
        const sql = `
            SELECT DATE(created_at) AS day, COALESCE(SUM(total), 0) AS total
            FROM orders
            WHERE created_at BETWEEN ? AND ?
            GROUP BY day
            ORDER BY day
        `;
        db.query(sql, [range.start, range.end], callback);
    },

    getTopProducts: (range, limit, callback) => {
        const sql = `
            SELECT h.hoodie_id, h.name,
                   SUM(oi.quantity) AS units_sold,
                   SUM(oi.quantity * oi.price) AS revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN hoodies h ON oi.hoodie_id = h.hoodie_id
            WHERE o.created_at BETWEEN ? AND ?
            GROUP BY h.hoodie_id, h.name
            ORDER BY revenue DESC
            LIMIT ?
        `;
        db.query(sql, [range.start, range.end, limit], callback);
    },

    getLeastProducts: (range, limit, callback) => {
        const sql = `
            SELECT h.hoodie_id, h.name,
                   COALESCE(SUM(oi.quantity), 0) AS units_sold,
                   COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue
            FROM hoodies h
            LEFT JOIN order_items oi ON oi.hoodie_id = h.hoodie_id
            LEFT JOIN orders o ON oi.order_id = o.order_id
                AND o.created_at BETWEEN ? AND ?
            GROUP BY h.hoodie_id, h.name
            ORDER BY units_sold ASC, revenue ASC
            LIMIT ?
        `;
        db.query(sql, [range.start, range.end, limit], callback);
    },

    getRefundSummary: (range, callback) => {
        const sql = `
            SELECT
                SUM(CASE WHEN refund_status = 'requested' THEN 1 ELSE 0 END) AS requested_count,
                SUM(CASE WHEN refund_status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
                SUM(CASE WHEN refund_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
                COALESCE(SUM(CASE WHEN refund_status = 'approved' THEN total ELSE 0 END), 0) AS approved_amount
            FROM orders
            WHERE created_at BETWEEN ? AND ?
        `;
        db.query(sql, [range.start, range.end], callback);
    }
};

module.exports = Report;
