const db = require('../db');

const Review = {
    upsert: (data, callback) => {
        const sql = `
            INSERT INTO reviews (user_id, order_id, hoodie_id, rating, review_text, tags, overall_fit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE rating = VALUES(rating),
                                    review_text = VALUES(review_text),
                                    tags = VALUES(tags),
                                    overall_fit = VALUES(overall_fit),
                                    updated_at = NOW()
        `;
        db.query(
            sql,
            [
                data.user_id,
                data.order_id,
                data.hoodie_id,
                data.rating,
                data.review_text || null,
                data.tags || null,
                data.overall_fit || null
            ],
            callback
        );
    },

    getByOrderForUser: (orderId, userId, callback) => {
        const sql = `
            SELECT review_id, hoodie_id, rating, review_text, tags, overall_fit, created_at, updated_at
            FROM reviews
            WHERE order_id = ? AND user_id = ?
        `;
        db.query(sql, [orderId, userId], callback);
    },

    getByHoodie: (hoodieId, callback) => {
        const sql = `
            SELECT r.review_id, r.rating, r.review_text, r.tags, r.overall_fit, r.created_at,
                   u.full_name
            FROM reviews r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.hoodie_id = ?
            ORDER BY r.created_at DESC
        `;
        db.query(sql, [hoodieId], callback);
    },

    getReviewableCountForUser: (userId, callback) => {
        const sql = `
            SELECT COUNT(DISTINCT oi.order_id, oi.hoodie_id) AS reviewable_count
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN reviews r
              ON r.order_id = o.order_id
             AND r.hoodie_id = oi.hoodie_id
             AND r.user_id = o.user_id
            WHERE o.user_id = ?
              AND o.status = 'delivered'
              AND r.review_id IS NULL
        `;
        db.query(sql, [userId], (err, rows) => {
            if (err) return callback(err);
            const count = rows && rows.length ? Number(rows[0].reviewable_count || 0) : 0;
            return callback(null, count);
        });
    },

    getReviewableCountsByOrder: (userId, callback) => {
        const sql = `
            SELECT o.order_id, COUNT(DISTINCT oi.order_id, oi.hoodie_id) AS reviewable_count
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN reviews r
              ON r.order_id = o.order_id
             AND r.hoodie_id = oi.hoodie_id
             AND r.user_id = o.user_id
            WHERE o.user_id = ?
              AND o.status = 'delivered'
              AND r.review_id IS NULL
            GROUP BY o.order_id
        `;
        db.query(sql, [userId], (err, rows) => {
            if (err) return callback(err);
            const map = {};
            (rows || []).forEach((row) => {
                map[row.order_id] = Number(row.reviewable_count || 0);
            });
            return callback(null, map);
        });
    },

    insertManyWithReward: (userId, orderId, reviews, callback) => {
        if (!reviews || reviews.length === 0) {
            return callback(null, { inserted: 0, stitches: 0 });
        }
        const values = reviews.map((r) => ([
            userId,
            orderId,
            r.hoodie_id,
            r.rating,
            r.review_text || null,
            r.tags || null,
            r.overall_fit || null
        ]));

        db.beginTransaction((err) => {
            if (err) return callback(err);
            const sql = `
                INSERT IGNORE INTO reviews
                    (user_id, order_id, hoodie_id, rating, review_text, tags, overall_fit)
                VALUES ?
            `;
            db.query(sql, [values], (insErr, result) => {
                if (insErr) return db.rollback(() => callback(insErr));
                const inserted = Number(result && result.affectedRows ? result.affectedRows : 0);
                const stitches = inserted * 10;
                if (inserted === 0) {
                    return db.commit((commitErr) => {
                        if (commitErr) return db.rollback(() => callback(commitErr));
                        return callback(null, { inserted, stitches: 0 });
                    });
                }
                db.query(
                    'UPDATE users SET stitches_balance = stitches_balance + ? WHERE user_id = ?',
                    [stitches, userId],
                    (updErr) => {
                        if (updErr) return db.rollback(() => callback(updErr));
                        db.commit((commitErr) => {
                            if (commitErr) return db.rollback(() => callback(commitErr));
                            return callback(null, { inserted, stitches });
                        });
                    }
                );
            });
        });
    }
};

module.exports = Review;
