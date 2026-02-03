const db = require('../db');
const Hoodie = require('../Models/Hoodie');
const User = require('../Models/User');
const Order = require('../Models/Order');
const Report = require('../Models/Report');

const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const toDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const makeRange = (days) => {
    const today = new Date();
    const startDate = addDays(today, -1 * (days - 1));
    const startText = `${toDateInputValue(startDate)} 00:00:00`;
    const endText = `${toDateInputValue(today)} 23:59:59`;
    return { start: startText, end: endText };
};

const formatDateLabel = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
};

const countTable = (table, cb) => {
    db.query(`SELECT COUNT(*) as count FROM ${table}`, (err, results) => {
        if (err) return cb(err);
        cb(null, results[0].count);
    });
};

const AdminController = {
    dashboard: (req, res) => {
        const stats = {};
        countTable('users', (err, userCount) => {
            if (err) return res.status(500).send('Failed to load dashboard');
            stats.users = userCount;
            countTable('hoodies', (err2, hoodieCount) => {
                if (err2) return res.status(500).send('Failed to load dashboard');
                stats.hoodies = hoodieCount;
                countTable('orders', (err3, orderCount) => {
                    if (err3) return res.status(500).send('Failed to load dashboard');
                    stats.orders = orderCount;
                    Hoodie.getAll((err4, hoodies) => {
                        if (err4) return res.status(500).send('Failed to load dashboard');
                        const lowStockHoodies = (hoodies || []).filter(
                            (hoodie) => Number(hoodie.stock) <= 5
                        );
                        Order.getRecent(5, (err5, recentOrders) => {
                            if (err5) return res.status(500).send('Failed to load dashboard');
                            const range = makeRange(14);
                            Report.getDailySales(range, (err6, dailyRows) => {
                                if (err6) return res.status(500).send('Failed to load dashboard');
                                Report.getTopProducts(range, 5, (err7, topRows) => {
                                    if (err7) return res.status(500).send('Failed to load dashboard');
                                    const dailySales = (dailyRows || []).map((row) => ({
                                        label: formatDateLabel(row.day),
                                        total: Number(row.total || 0)
                                    }));
                                    const topProducts = (topRows || []).map((row) => ({
                                        name: row.name,
                                        units: Number(row.units_sold || 0),
                                        revenue: Number(row.revenue || 0)
                                    }));
                                    res.render('admin', {
                                        stats,
                                        user: req.session.user,
                                        lowStockHoodies,
                                        recentOrders: recentOrders || [],
                                        dailySales,
                                        topProducts
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },

    inventoryPage: (req, res) => {
        Hoodie.getAll((err, hoodies) => {
            if (err) return res.status(500).send('Failed to load inventory');
            const inventory = (hoodies || []).map((hoodie) => ({
                ...hoodie,
                lowStock: Number(hoodie.stock) <= 5
            }));

            const q = (req.query.q || '').trim().toLowerCase();
            const season = (req.query.season || '').trim();
            const stockStatus = (req.query.stock_status || '').trim(); // low, in, out

            const filtered = inventory.filter((item) => {
                const matchesText =
                    !q ||
                    item.name.toLowerCase().includes(q) ||
                    (item.description || '').toLowerCase().includes(q);
                const matchesSeason = !season || item.season === season;
                const stockNum = Number(item.stock || 0);
                let matchesStock = true;
                if (stockStatus === 'low') matchesStock = item.lowStock && stockNum > 0;
                if (stockStatus === 'in') matchesStock = stockNum > 0;
                if (stockStatus === 'out') matchesStock = stockNum === 0;
                return matchesText && matchesSeason && matchesStock;
            });

            res.render('inventory', {
                user: req.session.user,
                hoodies: filtered,
                filters: {
                    q: req.query.q || '',
                    season,
                    stock_status: stockStatus
                }
            });
        });
    },

    usersPage: (req, res) => {
        User.getAll((err, users) => {
            if (err) return res.status(500).send('Failed to load users');
            const q = (req.query.q || '').trim().toLowerCase();
            const role = (req.query.role || 'all').toLowerCase();
            const filtered = (users || []).filter((u) => {
                const matchesText =
                    !q ||
                    u.full_name.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    (u.role || '').toLowerCase().includes(q);
                const matchesRole = role === 'all' ? true : (u.role || '').toLowerCase() === role;
                return matchesText && matchesRole;
            });
            res.render('users', {
                user: req.session.user,
                users: filtered,
                filters: { q: req.query.q || '', role }
            });
        });
    },

    updateUserPoints: (req, res) => {
        const userId = req.params.id;
        const points = Math.max(0, parseInt(req.body.points, 10) || 0);
        User.updatePoints(userId, points, (err) => {
            if (err) return res.status(500).send('Failed to update points');
            res.redirect('/admin/users');
        });
    },

    categoriesPage: (req, res) => {
        res.redirect('/admin/dashboard'); // placeholder; categories listing can be added here
    },

    restockHoodie: (req, res) => {
        const hoodieId = req.params.id;
        const quantity = Math.max(0, parseInt(req.body.quantity, 10) || 0);
        if (!hoodieId || quantity <= 0) {
            return res.status(400).send('Invalid restock quantity');
        }
        Hoodie.restock(hoodieId, quantity, (err) => {
            if (err) return res.status(500).send('Failed to restock hoodie');
            res.redirect('/admin/dashboard');
        });
    }
};

module.exports = AdminController;
