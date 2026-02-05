const db = require('../db');

const Review = {
    upsert: (data, callback) => {
        const sql = `
            INSERT INTO reviews (user_id, order_id, hoodie_id, rating, review_text)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE rating = VALUES(rating),
                                    review_text = VALUES(review_text),
                                    updated_at = NOW()
        `;
        db.query(
            sql,
            [data.user_id, data.order_id, data.hoodie_id, data.rating, data.review_text || null],
            callback
        );
    },

    getByOrderForUser: (orderId, userId, callback) => {
        const sql = `
            SELECT review_id, hoodie_id, rating, review_text, created_at, updated_at
            FROM reviews
            WHERE order_id = ? AND user_id = ?
        `;
        db.query(sql, [orderId, userId], callback);
    }
};

module.exports = Review;
