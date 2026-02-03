const db = require('../db');

// Helper: swallow missing-table errors so app still runs without migration
const isMissingTable = (err) => err && err.code === 'ER_NO_SUCH_TABLE';

const SavedCart = {
    getByUser: (userId, callback) => {
        const sql = `
            SELECT sci.hoodie_id, sci.quantity, sci.price, h.name, h.image_url
            FROM saved_cart_items sci
            LEFT JOIN hoodies h ON h.hoodie_id = sci.hoodie_id
            WHERE sci.user_id = ?
        `;
        db.query(sql, [userId], (err, rows) => {
            if (isMissingTable(err)) return callback(null, []);
            if (err) return callback(err);
            return callback(null, rows || []);
        });
    },

    saveForUser: (userId, items, callback) => {
        const done = callback || (() => {});
        const sqlDelete = 'DELETE FROM saved_cart_items WHERE user_id = ?';
        db.beginTransaction((txErr) => {
            if (isMissingTable(txErr)) return done(null);
            if (txErr) return done(txErr);
            db.query(sqlDelete, [userId], (delErr) => {
                if (delErr) {
                    if (isMissingTable(delErr)) return db.rollback(() => done(null));
                    return db.rollback(() => done(delErr));
                }
                if (!items || items.length === 0) {
                    return db.commit((cErr) => done(cErr || null));
                }
                const values = items.map((it) => [userId, it.hoodie_id, it.quantity, it.price]);
                const sqlInsert = `
                    INSERT INTO saved_cart_items (user_id, hoodie_id, quantity, price)
                    VALUES ?
                `;
                db.query(sqlInsert, [values], (insErr) => {
                    if (insErr) {
                        if (isMissingTable(insErr)) return db.rollback(() => done(null));
                        return db.rollback(() => done(insErr));
                    }
                    db.commit((cErr) => done(cErr || null));
                });
            });
        });
    }
};

module.exports = SavedCart;
