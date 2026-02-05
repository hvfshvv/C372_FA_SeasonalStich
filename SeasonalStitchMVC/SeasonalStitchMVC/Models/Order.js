const db = require('../db');

const Order = {
    createFromCart: (userId, cart, shipping, options, callback) => {
        if (!cart || cart.length === 0) return callback(new Error('Cart is empty'));
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        const discountAmount = Number(options.discount || 0);
        const pointsRedeemed = Number(options.pointsRedeemed || 0);
        const pointsEarned = Number(options.pointsEarned || 0);
        const newPoints = typeof options.newPoints === 'number' ? options.newPoints : null;
        const paymentProvider = options.paymentProvider || 'manual';
        const paymentRef = options.paymentRef || null;

        db.beginTransaction((err) => {
            if (err) return callback(err);

            const decrementStock = (items, done) => {
                let idx = 0;
                const step = () => {
                    if (idx >= items.length) return done();
                    const hoodieId = items[idx].hoodie_id;
                    const qty = Number(items[idx].quantity);

                    db.query(
                        'UPDATE hoodies SET stock = stock - ? WHERE hoodie_id = ? AND stock >= ?',
                        [qty, hoodieId, qty],
                        (updErr, result) => {
                            if (updErr) return done(updErr);
                            if (!result || result.affectedRows === 0) {
                                return done(new Error('Insufficient stock'));
                            }
                            idx += 1;
                            step();
                        }
                    );
                };
                step();
            };

            const grossTotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
            const total = Math.max(0, grossTotal - discountAmount);
            const orderData = {
                user_id: userId,
                total,
                shipping_name: shipping.name,
                shipping_address: shipping.address,
                status: 'pending',
                discount_amount: discountAmount,
                points_redeemed: pointsRedeemed,
                points_earned: pointsEarned,
                payment_status: 'paid',
                payment_provider: paymentProvider,
                payment_ref: paymentRef,
                paid_at: new Date()
            };

            db.query('INSERT INTO orders SET ?', orderData, (orderErr, orderResult) => {
                if (orderErr) {
                    return db.rollback(() => callback(orderErr));
                }

                const orderId = orderResult.insertId;
                const items = cart.map(item => [orderId, item.hoodie_id, item.quantity, item.price]);
                const sql = 'INSERT INTO order_items (order_id, hoodie_id, quantity, price) VALUES ?';

                db.query(sql, [items], (itemsErr) => {
                    if (itemsErr) {
                        return db.rollback(() => callback(itemsErr));
                    }

                    decrementStock(cart, (stockErr) => {
                        if (stockErr) {
                            return db.rollback(() => callback(stockErr));
                        }

                        const finalize = () => {
                            db.commit((commitErr) => {
                                if (commitErr) {
                                    return db.rollback(() => callback(commitErr));
                                }
                                callback(null, { orderId, total });
                            });
                        };

                        if (newPoints === null) {
                            return finalize();
                        }

                        db.query(
                            'UPDATE users SET points = ? WHERE user_id = ?',
                            [newPoints, userId],
                            (pointsErr) => {
                                if (pointsErr) {
                                    return db.rollback(() => callback(pointsErr));
                                }
                                finalize();
                            }
                        );
                    });
                });
            });
        });
    },

    getByUser: (userId, callback) => {
        const sql = `
            SELECT o.order_id, o.total, o.shipping_name, o.shipping_address, o.status, o.created_at,
                   o.tracking_number, o.tracking_provider, o.tracking_url,
                   o.refund_status, o.refund_reason, o.refund_note,
                   COUNT(oi.order_id) AS item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.order_id
            ORDER BY o.created_at DESC
        `;
        db.query(sql, [userId], callback);
    },

    getAll: (callback) => {
        const sql = `
            SELECT o.order_id, o.total, o.shipping_name, o.shipping_address, o.status, o.created_at,
                   o.tracking_number, o.tracking_provider, o.tracking_url,
                   o.refund_status, o.refund_reason, o.refund_note,
                   u.full_name, u.email, COUNT(oi.order_id) AS item_count
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            GROUP BY o.order_id
            ORDER BY o.created_at DESC
        `;
        db.query(sql, callback);
    },

    getRecent: (limit, callback) => {
        const sql = `
            SELECT o.order_id, o.total, o.status, o.created_at,
                   u.full_name, u.email
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            ORDER BY o.created_at DESC
            LIMIT ?
        `;
        db.query(sql, [Number(limit) || 5], callback);
    },

    getById: (orderId, callback) => {
        const sql = `
            SELECT o.order_id, o.user_id, o.total, o.shipping_name, o.shipping_address, o.status, o.created_at,
                   o.payment_status, o.payment_provider, o.payment_ref, o.paid_at,
                   o.tracking_number, o.tracking_provider, o.tracking_url,
                   o.refund_status, o.refund_reason, o.refund_note
            FROM orders o
            WHERE o.order_id = ?
        `;
        db.query(sql, [orderId], (err, rows) => {
            if (err) return callback(err);
            if (!rows || rows.length === 0) return callback(null, null);
            callback(null, rows[0]);
        });
    },

    getOrderItemForUser: (orderId, hoodieId, userId, callback) => {
        const sql = `
            SELECT o.order_id, o.user_id, o.status, oi.hoodie_id
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            WHERE o.order_id = ? AND oi.hoodie_id = ? AND o.user_id = ?
            LIMIT 1
        `;
        db.query(sql, [orderId, hoodieId, userId], (err, rows) => {
            if (err) return callback(err);
            if (!rows || rows.length === 0) return callback(null, null);
            callback(null, rows[0]);
        });
    },

    updateStatus: (orderId, status, callback) => {
        const sql = 'UPDATE orders SET status = ? WHERE order_id = ?';
        db.query(sql, [status, orderId], callback);
    },

    getWithItems: (orderId, callback) => {
        const sql = `
            SELECT o.order_id, o.user_id, o.total, o.shipping_name, o.shipping_address, o.status, o.created_at,
                   o.payment_status, o.payment_provider, o.payment_ref, o.paid_at,
                   o.tracking_number, o.tracking_provider, o.tracking_url,
                   o.refund_status, o.refund_reason, o.refund_note,
                   u.full_name, u.email,
                   oi.quantity, oi.price, h.hoodie_id, h.name, h.image_url
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            JOIN order_items oi ON o.order_id = oi.order_id
            JOIN hoodies h ON oi.hoodie_id = h.hoodie_id
            WHERE o.order_id = ?
        `;

        db.query(sql, [orderId], (err, rows) => {
            if (err) return callback(err);
            if (!rows || rows.length === 0) return callback(null, null);

            const order = {
                order_id: rows[0].order_id,
                user_id: rows[0].user_id,
                total: rows[0].total,
                shipping_name: rows[0].shipping_name,
                shipping_address: rows[0].shipping_address,
                created_at: rows[0].created_at,
                status: rows[0].status,
                payment_status: rows[0].payment_status,
                payment_provider: rows[0].payment_provider,
                payment_ref: rows[0].payment_ref,
                paid_at: rows[0].paid_at,
                tracking_number: rows[0].tracking_number,
                tracking_provider: rows[0].tracking_provider,
                tracking_url: rows[0].tracking_url,
                refund_status: rows[0].refund_status,
                refund_reason: rows[0].refund_reason,
                refund_note: rows[0].refund_note,
                full_name: rows[0].full_name,
                email: rows[0].email
            };

            const items = rows.map(r => ({
                hoodie_id: r.hoodie_id,
                name: r.name,
                image_url: r.image_url,
                quantity: r.quantity,
                price: r.price
            }));

            callback(null, { order, items });
        });
    },

    updateTracking: (orderId, tracking, callback) => {
        const sql = `
            UPDATE orders
            SET tracking_number = ?, tracking_provider = ?, tracking_url = ?
            WHERE order_id = ?
        `;
        db.query(
            sql,
            [
                tracking.tracking_number || null,
                tracking.tracking_provider || null,
                tracking.tracking_url || null,
                orderId
            ],
            callback
        );
    },

    requestRefund: (orderId, reason, callback) => {
        const sql = `
            UPDATE orders
            SET refund_status = 'requested',
                refund_reason = ?,
                refund_note = NULL,
                refund_requested_at = NOW(),
                refund_resolved_at = NULL
            WHERE order_id = ?
        `;
        db.query(sql, [reason || null, orderId], callback);
    },

    resolveRefund: (orderId, status, note, callback) => {
        const sql = `
            UPDATE orders
            SET refund_status = ?,
                refund_note = ?,
                refund_resolved_at = NOW()
            WHERE order_id = ?
        `;
        db.query(sql, [status, note || null, orderId], callback);
    },

    getItems: (orderId, callback) => {
        const sql = `
            SELECT hoodie_id, quantity, price
            FROM order_items
            WHERE order_id = ?
        `;
        db.query(sql, [orderId], callback);
    },

    getTotalsFromItems: (orderId, callback) => {
        const sql = `
            SELECT COALESCE(SUM(quantity * price), 0) AS total
            FROM order_items
            WHERE order_id = ?
        `;
        db.query(sql, [orderId], (err, rows) => {
            if (err) return callback(err);
            if (!rows || rows.length === 0) return callback(null, 0);
            return callback(null, Number(rows[0].total || 0));
        });
    },

    finalizeStripePayment: (orderId, paymentRef, callback) => {
        db.beginTransaction((err) => {
            if (err) return callback(err);

            db.query(
                'SELECT order_id, payment_status FROM orders WHERE order_id = ? FOR UPDATE',
                [orderId],
                (lockErr, rows) => {
                    if (lockErr) return db.rollback(() => callback(lockErr));
                    if (!rows || rows.length === 0) {
                        return db.rollback(() => callback(new Error('Order not found')));
                    }
                    if (rows[0].payment_status === 'paid') {
                        return db.commit((commitErr) => {
                            if (commitErr) return db.rollback(() => callback(commitErr));
                            return callback(null, { alreadyPaid: true });
                        });
                    }

                    db.query(
                        'SELECT hoodie_id, quantity FROM order_items WHERE order_id = ?',
                        [orderId],
                        (itemsErr, items) => {
                            if (itemsErr) return db.rollback(() => callback(itemsErr));
                            if (!items || items.length === 0) {
                                return db.rollback(() => callback(new Error('Order has no items')));
                            }

                            let idx = 0;
                            const step = () => {
                                if (idx >= items.length) return markPaid();
                                const item = items[idx];
                                const qty = Number(item.quantity);
                                db.query(
                                    'UPDATE hoodies SET stock = stock - ? WHERE hoodie_id = ? AND stock >= ?',
                                    [qty, item.hoodie_id, qty],
                                    (updErr, result) => {
                                        if (updErr) return db.rollback(() => callback(updErr));
                                        if (!result || result.affectedRows === 0) {
                                            return db.rollback(() => callback(new Error('Insufficient stock')));
                                        }
                                        idx += 1;
                                        return step();
                                    }
                                );
                            };

                            const markPaid = () => {
                                db.query(
                                    `UPDATE orders
                                     SET payment_status = 'paid',
                                         payment_provider = 'stripe',
                                         payment_ref = ?,
                                         paid_at = NOW()
                                     WHERE order_id = ?`,
                                    [paymentRef || null, orderId],
                                    (payErr) => {
                                        if (payErr) return db.rollback(() => callback(payErr));
                                        db.commit((commitErr) => {
                                            if (commitErr) return db.rollback(() => callback(commitErr));
                                            return callback(null, { alreadyPaid: false });
                                        });
                                    }
                                );
                            };

                            step();
                        }
                    );
                }
            );
        });
    }
};

module.exports = Order;
