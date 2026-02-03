const db = require('../db');

const PromoCode = {
    getValidByCode: (code, callback) => {
        const sql = `
            SELECT code, discount_percent, expiry, active
            FROM promo_codes
            WHERE code = ?
              AND active = 1
              AND (expiry IS NULL OR expiry >= NOW())
            LIMIT 1
        `;
        db.query(sql, [code], (err, rows) => {
            if (err) return callback(err);
            if (!rows || rows.length === 0) return callback(null, null);
            return callback(null, rows[0]);
        });
    }
};

module.exports = PromoCode;
