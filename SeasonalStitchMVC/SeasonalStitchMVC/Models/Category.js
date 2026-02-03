const db = require('../db');

const Category = {
    getAll: (callback) => {
        db.query('SELECT * FROM categories ORDER BY name', callback);
    },

    getById: (id, callback) => {
        db.query('SELECT * FROM categories WHERE category_id = ?', [id], (err, results) => {
            if (err) return callback(err);
            callback(null, results[0]);
        });
    },

    add: (name, callback) => {
        db.query('INSERT INTO categories (name) VALUES (?)', [name], callback);
    },

    update: (id, name, callback) => {
        db.query('UPDATE categories SET name = ? WHERE category_id = ?', [name, id], callback);
    },

    delete: (id, callback) => {
        db.query('DELETE FROM categories WHERE category_id = ?', [id], callback);
    }
};

module.exports = Category;
