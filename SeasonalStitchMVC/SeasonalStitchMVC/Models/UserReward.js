const db = require('../db');

const UserReward = {
    redeem: (userId, reward, callback) => {
        db.beginTransaction((err) => {
            if (err) return callback(err);

            db.query(
                'SELECT stitches_balance FROM users WHERE user_id = ? FOR UPDATE',
                [userId],
                (lockErr, rows) => {
                    if (lockErr) return db.rollback(() => callback(lockErr));
                    if (!rows || rows.length === 0) {
                        return db.rollback(() => callback(new Error('User not found')));
                    }
                    const currentBalance = Number(rows[0].stitches_balance || 0);
                    if (currentBalance < reward.stitches) {
                        return db.rollback(() => callback(null, { ok: false, reason: 'insufficient' }));
                    }

                    db.query(
                        'UPDATE users SET stitches_balance = stitches_balance - ? WHERE user_id = ?',
                        [reward.stitches, userId],
                        (updErr) => {
                            if (updErr) return db.rollback(() => callback(updErr));
                            db.query(
                                `INSERT INTO user_rewards
                                 (user_id, reward_code, reward_name, stitches_cost, min_spend, reward_value, reward_type)
                                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    userId,
                                    reward.id,
                                    reward.name,
                                    reward.stitches,
                                    reward.minSpend,
                                    reward.value,
                                    reward.type
                                ],
                                (insErr) => {
                                    if (insErr) return db.rollback(() => callback(insErr));
                                    db.commit((commitErr) => {
                                        if (commitErr) return db.rollback(() => callback(commitErr));
                                        return callback(null, { ok: true, newBalance: currentBalance - reward.stitches });
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    }
};

module.exports = UserReward;
