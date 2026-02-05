// models/Hoodie.js
const db = require('../db');

// Model for interacting with the "hoodies" table
const Hoodie = {
    getAll: (callback) => {
        const sql = `
            SELECT h.*,
                   COALESCE(r.avg_rating, 0) AS avg_rating,
                   COALESCE(r.review_count, 0) AS review_count
            FROM hoodies h
            LEFT JOIN (
                SELECT hoodie_id,
                       AVG(rating) AS avg_rating,
                       COUNT(review_id) AS review_count
                FROM reviews
                GROUP BY hoodie_id
            ) r ON r.hoodie_id = h.hoodie_id
        `;
        db.query(sql, callback);
    },

    getById: (id, callback) => {
        const sql = 'SELECT * FROM hoodies WHERE hoodie_id = ?';
        db.query(sql, [id], (err, results) => {
            if (err) return callback(err);
            callback(null, results[0]);
        });
    },

    add: (data, callback) => {
        const sql = 'INSERT INTO hoodies (name, description, price, image_url, stock, season) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(sql, [data.name, data.description, data.price, data.image_url, data.stock, data.season], callback);
    },

    update: (id, data, callback) => {
        const sql = 'UPDATE hoodies SET name=?, description=?, price=?, image_url=?, stock=?, season=? WHERE hoodie_id=?';
        db.query(sql, [data.name, data.description, data.price, data.image_url, data.stock, data.season, id], callback);
    },

    delete: (id, callback) => {
        const sql = 'DELETE FROM hoodies WHERE hoodie_id = ?';
        db.query(sql, [id], callback);
    },

    restock: (id, quantity, callback) => {
        const sql = 'UPDATE hoodies SET stock = stock + ? WHERE hoodie_id = ?';
        db.query(sql, [quantity, id], callback);
    }
};

module.exports = Hoodie;



