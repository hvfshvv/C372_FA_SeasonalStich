const PDFDocument = require('pdfkit');
const Order = require('../Models/Order');
const Invoice = require('../Models/Invoice');
const PromoCode = require('../Models/PromoCode');
const Review = require('../Models/Review');
const { calculatePricing, getMaxPointsDiscount } = require('../utils/pricing');

const buildTotals = (cart) => cart.reduce(
    (acc, item) => {
        acc.items += item.quantity;
        acc.total += Number(item.price) * item.quantity;
        return acc;
    },
    { items: 0, total: 0 }
);

const normalizePromoCode = (code) => (code || '').trim().toUpperCase();

const ensureInvoice = (orderId, total, callback) => {
    Invoice.getByOrderId(orderId, (err, invoice) => {
        if (err) return callback(err);
        if (invoice) return callback(null, invoice);
        return Invoice.create(orderId, total, (createErr) => {
            if (createErr) return callback(createErr);
            return Invoice.getByOrderId(orderId, callback);
        });
    });
};

const loadInvoiceData = (orderId, sessionUser, callback) => {
    Order.getWithItems(orderId, (err, data) => {
        if (err) return callback(err);
        if (!data || !data.order) return callback({ status: 404, message: 'Order not found' });
        const isAdmin = sessionUser && sessionUser.role === 'admin';
        if (!isAdmin && data.order.user_id !== sessionUser.user_id) {
            return callback({ status: 403, message: 'Forbidden' });
        }
        const total = Number(data.order.total) || 0;
        ensureInvoice(orderId, total, (invErr, invoice) => {
            if (invErr) return callback(invErr);
            return callback(null, { order: data.order, items: data.items, invoice });
        });
    });
};

const renderCheckout = (req, res, payload) => {
    res.render('checkout', {
        cart: payload.cart,
        totals: payload.totals,
        user: req.session.user,
        paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
        stripeEnabled: Boolean(process.env.STRIPE_SECRET_KEY || process.env.stripe_secret_key),
        availablePoints: payload.availablePoints,
        maxDiscount: payload.maxDiscount,
        promoCode: payload.promoCode || '',
        promoPercent: payload.promoPercent || 0,
        promoDiscount: payload.promoDiscount || 0,
        promoError: payload.promoError || ''
    });
};

const OrderController = {
    checkoutPage: (req, res) => {
        const cart = req.session.cart || [];
        if (!cart.length) return res.redirect('/cart');
        const totals = buildTotals(cart);
        const availablePoints = Number(req.session.user.points || 0);
        const maxDiscount = getMaxPointsDiscount(totals.total, availablePoints);
        renderCheckout(req, res, {
            cart,
            totals,
            availablePoints,
            maxDiscount
        });
    },

    applyPromo: (req, res) => {
        const cart = req.session.cart || [];
        if (!cart.length) return res.redirect('/cart');
        const totals = buildTotals(cart);
        const availablePoints = Number(req.session.user.points || 0);
        const promoCode = normalizePromoCode(req.body.promo_code);

        if (!promoCode) {
            const maxDiscount = getMaxPointsDiscount(totals.total, availablePoints);
            return renderCheckout(req, res, {
                cart,
                totals,
                availablePoints,
                maxDiscount
            });
        }

        PromoCode.getValidByCode(promoCode, (err, promo) => {
            if (err) return res.status(500).send('Failed to validate promo code');
            if (!promo) {
                const maxDiscount = getMaxPointsDiscount(totals.total, availablePoints);
                return renderCheckout(req, res, {
                    cart,
                    totals,
                    availablePoints,
                    maxDiscount,
                    promoCode,
                    promoError: 'Promo code is invalid or expired.'
                });
            }

            const promoPercent = Number(promo.discount_percent || 0);
            const pricing = calculatePricing({
                baseTotal: totals.total,
                availablePoints,
                usePoints: false,
                promoPercent
            });

            return renderCheckout(req, res, {
                cart,
                totals,
                availablePoints,
                maxDiscount: pricing.maxPointsDiscount,
                promoCode,
                promoPercent,
                promoDiscount: pricing.promoDiscount
            });
        });
    },

    placeOrder: (req, res) => {
        const cart = req.session.cart || [];
        if (!cart.length) return res.redirect('/cart');

        const shipping = {
            name: req.body.shipping_name || '',
            address: req.body.shipping_address || ''
        };
        const cartTotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
        const availablePoints = Number(req.session.user.points || 0);
        const wantsPoints = req.body.use_points === 'on';
        const promoCode = normalizePromoCode(req.body.promo_code);

        const applyPricing = (promoPercent) => {
            const pricing = calculatePricing({
                baseTotal: cartTotal,
                availablePoints,
                usePoints: wantsPoints,
                promoPercent
            });
            const totalDiscount = pricing.promoDiscount + pricing.pointsDiscount;
            const newPoints = availablePoints - pricing.pointsRedeemed + pricing.pointsEarned;

            Order.createFromCart(
                req.session.user.user_id,
                cart,
                shipping,
                {
                    discount: totalDiscount,
                    pointsRedeemed: pricing.pointsRedeemed,
                    pointsEarned: pricing.pointsEarned,
                    newPoints,
                    paymentProvider: 'manual'
                },
                (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Failed to place order');
                }
                Invoice.create(result.orderId, result.total, (invErr) => {
                    if (invErr) {
                        console.error(invErr);
                    }
                    req.session.user.points = newPoints;
                    req.session.cart = [];
                    res.redirect(`/order-summary/${result.orderId}`);
                });
            });
        };

        if (!promoCode) {
            return applyPricing(0);
        }

        PromoCode.getValidByCode(promoCode, (err, promo) => {
            if (err) return res.status(500).send('Failed to validate promo code');
            if (!promo) {
                const totals = buildTotals(cart);
                const maxDiscount = getMaxPointsDiscount(totals.total, availablePoints);
                return renderCheckout(req, res.status(400), {
                    cart,
                    totals,
                    availablePoints,
                    maxDiscount,
                    promoCode,
                    promoError: 'Promo code is invalid or expired.'
                });
            }
            return applyPricing(Number(promo.discount_percent || 0));
        });
    },

    placeOrderPaypal: (req, res) => {
        const cart = req.session.cart || [];
        if (!cart.length) return res.status(400).json({ error: 'Cart is empty' });

        const shipping = {
            name: req.body.shipping_name || '',
            address: req.body.shipping_address || ''
        };

        if (!shipping.name || !shipping.address) {
            return res.status(400).json({ error: 'Missing shipping details' });
        }

        const cartTotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
        const availablePoints = Number(req.session.user.points || 0);
        const wantsPoints = req.body.use_points === true || req.body.use_points === 'true';
        const promoCode = normalizePromoCode(req.body.promo_code);
        const paypalRef = req.body.paypal_ref || req.body.paypal_order_id || null;

        const applyPricing = (promoPercent) => {
            const pricing = calculatePricing({
                baseTotal: cartTotal,
                availablePoints,
                usePoints: wantsPoints,
                promoPercent
            });
            const totalDiscount = pricing.promoDiscount + pricing.pointsDiscount;
            const newPoints = availablePoints - pricing.pointsRedeemed + pricing.pointsEarned;

            Order.createFromCart(
                req.session.user.user_id,
                cart,
                shipping,
                {
                    discount: totalDiscount,
                    pointsRedeemed: pricing.pointsRedeemed,
                    pointsEarned: pricing.pointsEarned,
                    newPoints,
                    paymentProvider: 'paypal',
                    paymentRef: paypalRef || null
                },
                (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Failed to place order' });
                }
                Invoice.create(result.orderId, result.total, (invErr) => {
                    if (invErr) {
                        console.error(invErr);
                    }
                    req.session.user.points = newPoints;
                    req.session.cart = [];
                    res.json({ orderId: result.orderId });
                });
            });
        };

        if (!promoCode) {
            return applyPricing(0);
        }

        PromoCode.getValidByCode(promoCode, (err, promo) => {
            if (err) return res.status(500).json({ error: 'Failed to validate promo code' });
            if (!promo) return res.status(400).json({ error: 'Promo code is invalid or expired' });
            return applyPricing(Number(promo.discount_percent || 0));
        });
    },

    history: (req, res) => {
        Order.getByUser(req.session.user.user_id, (err, orders) => {
            if (err) return res.status(500).send('Failed to load orders');
            const statusFilter = (req.query.status || 'all').toLowerCase();
            const filtered = (orders || []).filter((order) => {
                const status = (order.status === 'on_hold' ? 'pending' : (order.status || 'pending')).toLowerCase();
                return statusFilter === 'all' ? true : status === statusFilter;
            });
            res.render('orders', {
                orders: filtered,
                user: req.session.user,
                isAdmin: false,
                filters: { status: statusFilter }
            });
        });
    },

    adminHistory: (req, res) => {
        Order.getAll((err, orders) => {
            if (err) return res.status(500).send('Failed to load orders');

            const q = (req.query.q || '').trim().toLowerCase();
            const statusFilter = (req.query.status || 'all').toLowerCase();
            const refundFilter = (req.query.refund || 'all').toLowerCase();

            const filtered = (orders || []).filter((order) => {
                const status = (order.status === 'on_hold' ? 'pending' : (order.status || 'pending')).toLowerCase();
                const refundStatus = (order.refund_status || 'none').toLowerCase();
                const customerText = `${order.full_name || ''} ${order.email || ''} ${order.shipping_name || ''}`.toLowerCase();
                const matchesQ = !q || customerText.includes(q) || String(order.order_id || '').includes(q);
                const matchesStatus = statusFilter === 'all' ? true : status === statusFilter;
                const matchesRefund = refundFilter === 'all' ? true : refundStatus === refundFilter;
                return matchesQ && matchesStatus && matchesRefund;
            });

            res.render('orders', {
                orders: filtered,
                user: req.session.user,
                isAdmin: true,
                filters: {
                    q: req.query.q || '',
                    status: statusFilter,
                    refund: refundFilter
                }
            });
        });
    },

    updateStatus: (req, res) => {
        const orderId = req.params.id;
        const status = req.body.status;
        const allowed = ['pending', 'delivering', 'delivered'];
        if (!allowed.includes(status)) {
            return res.status(400).send('Invalid status');
        }
        Order.updateStatus(orderId, status, (err) => {
            if (err) return res.status(500).send('Failed to update status');
            res.redirect('/admin/orders');
        });
    },

    trackingPage: (req, res) => {
        const orderId = req.params.id;
        Order.getById(orderId, (err, order) => {
            if (err) return res.status(500).send('Failed to load tracking');
            if (!order) return res.status(404).send('Order not found');
            const isAdmin = req.session.user && req.session.user.role === 'admin';
            if (!isAdmin && order.user_id !== req.session.user.user_id) {
                return res.status(403).send('Forbidden');
            }
            res.render('tracking', { order, user: req.session.user });
        });
    },

    checkoutSuccess: (req, res) => {
        const orderId = req.params.id;
        Order.getById(orderId, (err, order) => {
            if (err) return res.status(500).send('Failed to load order');
            if (!order) return res.status(404).send('Order not found');
            const isAdmin = req.session.user && req.session.user.role === 'admin';
            if (!isAdmin && order.user_id !== req.session.user.user_id) {
                return res.status(403).send('Forbidden');
            }
            res.render('checkout-success', {
                orderId: order.order_id,
                total: Number(order.total),
                paymentRef: order.payment_ref || '',
                paymentProvider: order.payment_provider || '',
                user: req.session.user
            });
        });
    },

    summaryByOrderId: (req, res) => {
        const orderId = req.params.id;
        Order.getWithItems(orderId, (err, data) => {
            if (err) return res.status(500).send('Failed to load order summary');
            if (!data || !data.order) return res.status(404).send('Order not found');
            const isAdmin = req.session.user && req.session.user.role === 'admin';
            if (!isAdmin && data.order.user_id !== req.session.user.user_id) {
                return res.status(403).send('Forbidden');
            }

            const totals = data.items.reduce(
                (acc, item) => {
                    acc.items += item.quantity;
                    acc.total += Number(item.price) * item.quantity;
                    return acc;
                },
                { items: 0, total: 0 }
            );

            const renderSummary = (reviews) => {
                const reviewMap = (reviews || []).reduce((acc, review) => {
                    acc[review.hoodie_id] = review;
                    return acc;
                }, {});

                res.render('order-summary', {
                    order: data.order,
                    items: data.items,
                    totals: { items: totals.items, total: Number(data.order.total) || totals.total },
                    user: req.session.user,
                    reviews: reviewMap
                });
            };

            if (!isAdmin) {
                return Review.getByOrderForUser(orderId, req.session.user.user_id, (revErr, reviews) => {
                    if (revErr) return res.status(500).send('Failed to load reviews');
                    return renderSummary(reviews);
                });
            }

            return renderSummary([]);
        });
    },

    invoicePage: (req, res) => {
        const orderId = req.params.id;
        loadInvoiceData(orderId, req.session.user, (err, payload) => {
            if (err) {
                const status = err.status || 500;
                const message = err.message || 'Failed to load invoice';
                return res.status(status).send(message);
            }
            res.render('invoice', {
                order: payload.order,
                items: payload.items,
                invoice: payload.invoice,
                user: req.session.user
            });
        });
    },

    invoicePdf: (req, res) => {
        const orderId = req.params.id;
        loadInvoiceData(orderId, req.session.user, (err, payload) => {
            if (err) {
                const status = err.status || 500;
                const message = err.message || 'Failed to load invoice';
                return res.status(status).send(message);
            }

            const { order, items, invoice } = payload;
            const doc = new PDFDocument({ margin: 50 });
            const orderDate = new Date(order.created_at);
            const dateLabel = Number.isNaN(orderDate.getTime())
                ? ''
                : orderDate.toLocaleDateString('en-SG', { year: 'numeric', month: 'short', day: 'numeric' });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);
            doc.pipe(res);

            doc.fontSize(20).text('Seasonal Stitch Invoice', { align: 'center' });
            doc.moveDown();

            doc.fontSize(12).text(`Invoice #: ${invoice.invoice_number || ''}`);
            doc.text(`Order ID: ${order.order_id}`);
            doc.text(`Date: ${dateLabel}`);
            doc.text(`Customer: ${order.shipping_name || ''}`);
            doc.text(`Ship To: ${order.shipping_address || ''}`);
            doc.text(`Payment Method: ${order.payment_provider || 'N/A'}`);
            doc.text(`Payment Ref: ${order.payment_ref || 'N/A'}`);
            doc.moveDown();

            doc.fontSize(13).text('Items', { underline: true });
            doc.moveDown(0.5);

            items.forEach((item) => {
                const lineTotal = Number(item.price) * Number(item.quantity);
                doc.fontSize(11).text(
                    `${item.name} (x${item.quantity}) - $${Number(item.price).toFixed(2)} = $${lineTotal.toFixed(2)}`
                );
            });

            doc.moveDown();
            doc.fontSize(12).text(`Subtotal: $${Number(invoice.subtotal).toFixed(2)}`);
            doc.text(`Tax: $${Number(invoice.tax).toFixed(2)}`);
            doc.text(`Total: $${Number(invoice.total).toFixed(2)}`);

            doc.end();
        });
    },

    requestRefund: (req, res) => {
        const orderId = req.params.id;
        const reason = (req.body.reason || '').trim();

        Order.getById(orderId, (err, order) => {
            if (err) return res.status(500).send('Failed to request refund');
            if (!order) return res.status(404).send('Order not found');
            if (order.user_id !== req.session.user.user_id) {
                return res.status(403).send('Forbidden');
            }

            if (order.status !== 'delivered') {
                return res.status(400).send('Refunds are available after delivery');
            }
            if (order.refund_status === 'requested' || order.refund_status === 'approved') {
                return res.status(400).send('Refund already requested');
            }

            Order.requestRefund(orderId, reason, (reqErr) => {
                if (reqErr) return res.status(500).send('Failed to request refund');
                res.redirect(`/order-summary/${orderId}`);
            });
        });
    },

    resolveRefund: (req, res) => {
        const orderId = req.params.id;
        const decision = req.body.decision;
        const note = (req.body.note || '').trim();
        const allowed = ['approved', 'rejected'];
        if (!allowed.includes(decision)) {
            return res.status(400).send('Invalid refund decision');
        }

        Order.resolveRefund(orderId, decision, note, (err) => {
            if (err) return res.status(500).send('Failed to update refund');
            res.redirect('/admin/orders');
        });
    },

    updateTracking: (req, res) => {
        const orderId = req.params.id;
        const tracking = {
            tracking_number: (req.body.tracking_number || '').trim(),
            tracking_provider: (req.body.tracking_provider || '').trim(),
            tracking_url: (req.body.tracking_url || '').trim()
        };

        Order.updateTracking(orderId, tracking, (err) => {
            if (err) return res.status(500).send('Failed to update tracking');
            res.redirect(`/order-summary/${orderId}`);
        });
    }
};

module.exports = OrderController;
