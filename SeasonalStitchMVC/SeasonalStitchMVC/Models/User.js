// models/User.js
const db = require('../db');
const bcrypt = require('bcryptjs');

const HASH_ROUNDS = 10;

const User = {
    // Register a new user (hash password before storing)
    register: (full_name, email, password, callback) => {
        bcrypt.hash(password, HASH_ROUNDS, (hashErr, hash) => {
            if (hashErr) return callback(hashErr);
            const sql = 'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, "user")';
            db.query(sql, [full_name, email, hash], callback);
        });
    },

    // Authenticate user with hashed password
    authenticate: (email, password, callback) => {
        const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
        db.query(sql, [email], (err, results) => {
            if (err) return callback(err);
            if (!results || results.length === 0) return callback(null, null);
            const user = results[0];
            bcrypt.compare(password, user.password, (cmpErr, match) => {
                if (cmpErr) return callback(cmpErr);
                if (match) return callback(null, user);
                // Fallback for legacy plain-text passwords; upgrade hash after successful login
                if (user.password === password) {
                    bcrypt.hash(password, HASH_ROUNDS, (rehashErr, newHash) => {
                        if (!rehashErr) {
                            db.query('UPDATE users SET password = ? WHERE user_id = ?', [newHash, user.user_id], () => {});
                        }
                    });
                    return callback(null, user);
                }
                return callback(null, null);
            });
        });
    },

    getById: (userId, callback) => {
        const sql = 'SELECT * FROM users WHERE user_id = ?';
        db.query(sql, [userId], (err, results) => {
            if (err) return callback(err);
            if (!results || results.length === 0) return callback(null, null);
            callback(null, results[0]);
        });
    },

    getAll: (callback) => {
        const sql = 'SELECT user_id, full_name, email, role, points FROM users ORDER BY full_name';
        db.query(sql, callback);
    },

    updatePoints: (userId, points, callback) => {
        const sql = 'UPDATE users SET points = ? WHERE user_id = ?';
        db.query(sql, [points, userId], callback);
    }
};

module.exports = User;
