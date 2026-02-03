const Order = require('../Models/Order');
const UserReward = require('../Models/UserReward');

const rewardsCatalog = [
    { id: 'STITCH-50', stitches: 50, name: '$5 voucher', minSpend: 25, type: 'voucher', value: 5 },
    { id: 'STITCH-75', stitches: 75, name: '$10 voucher', minSpend: 50, type: 'voucher', value: 10 },
    { id: 'STITCH-100', stitches: 100, name: '$20 voucher', minSpend: 100, type: 'voucher', value: 20 },
    { id: 'STITCH-150', stitches: 150, name: '$40 voucher', minSpend: 200, type: 'voucher', value: 40 },
    { id: 'STITCH-250', stitches: 250, name: 'Free hoodie', minSpend: 20, type: 'item', value: 0 }
];

const StitchyBankController = {
    page: (req, res) => {
        if (!req.session.user) return res.redirect('/login');
        const userId = req.session.user.user_id || req.session.user.id;
        if (!userId) return res.redirect('/login');

        Order.getByUser(userId, (err, orders) => {
            if (err) {
                console.error("stitchybank route error:", err);
                const message = req.session.stitchybankMessage || null;
                delete req.session.stitchybankMessage;
                return res.render('stitchybank', {
                    user: req.session.user,
                    stitchesBalance: req.session.user.stitches_balance ?? 0,
                    orders: [],
                    rewards: rewardsCatalog,
                    userRewards: [],
                    error: null,
                    message
                });
            }
            const message = req.session.stitchybankMessage || null;
            delete req.session.stitchybankMessage;
            res.render('stitchybank', {
                user: req.session.user,
                stitchesBalance: req.session.user.stitches_balance ?? 0,
                orders: orders || [],
                rewards: rewardsCatalog,
                userRewards: [],
                error: null,
                message
            });
        });
    },

    redeem: (req, res) => {
        if (!req.session.user) return res.redirect('/login');
        const rewardId = (req.body.rewardId || '').trim();
        const reward = rewardsCatalog.find((r) => r.id === rewardId);

        if (!reward) {
            req.session.stitchybankMessage = {
                type: 'error',
                text: 'Invalid reward selection.'
            };
            return res.redirect('/stitchybank');
        }

        UserReward.redeem(req.session.user.user_id, reward, (err, result) => {
            if (err) {
                console.error(err);
                req.session.stitchybankMessage = {
                    type: 'error',
                    text: 'Failed to redeem reward. Please try again.'
                };
                return res.redirect('/stitchybank');
            }

            if (!result || !result.ok) {
                req.session.stitchybankMessage = {
                    type: 'error',
                    text: 'Not enough Stitches to redeem this reward.'
                };
                return res.redirect('/stitchybank');
            }

            req.session.stitchybankMessage = {
                type: 'success',
                text: `Redeemed ${reward.name}!`
            };
            return res.redirect('/stitchybank');
        });
    }
};

module.exports = StitchyBankController;
