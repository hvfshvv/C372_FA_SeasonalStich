const db = require('../db');

const Invoice = {
    create: (orderId, total, callback) => {
        const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${orderId}`;
        const sql = `
            INSERT INTO invoices (order_id, invoice_number, subtotal, tax, total)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.query(sql, [orderId, invoiceNumber, total, 0, total], callback);
    },

    getByOrderId: (orderId, callback) => {
        const sql = 'SELECT * FROM invoices WHERE order_id = ?';
        db.query(sql, [orderId], (err, rows) => {
            if (err) return callback(err);
            if (!rows || rows.length === 0) return callback(null, null);
            callback(null, rows[0]);
        });
    }
};

module.exports = Invoice;
