const Stripe = require('stripe');
const Order = require('../Models/Order');
const Invoice = require('../Models/Invoice');
const PromoCode = require('../Models/PromoCode');
const { calculatePricing } = require('../utils/pricing');

const getStripeClient = () => {
    // Accept both STRIPE_SECRET_KEY and stripe_secret_key to match .env naming
    const key = process.env.STRIPE_SECRET_KEY || process.env.stripe_secret_key;
    if (!key) {
        return null;
    }
    return new Stripe(key);
};

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

const buildBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const normalizePromoCode = (code) => (code || '').trim().toUpperCase();

const StripeController = {
    createCartSession: (req, res) => {
        const stripe = getStripeClient();
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe is not configured' });
        }

        const cart = req.session.cart || [];
        if (!cart.length) return res.status(400).json({ error: 'Cart is empty' });

        const shippingName = (req.body.shipping_name || '').trim();
        const shippingAddress = (req.body.shipping_address || '').trim();
        if (!shippingName || !shippingAddress) {
            return res.status(400).json({ error: 'Missing shipping details' });
        }

        const cartTotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
        const availablePoints = Number(req.session.user.points || 0);
        const wantsPoints = req.body.use_points === true || req.body.use_points === 'true';
        const promoCode = normalizePromoCode(req.body.promo_code);

        const applyPricing = (promoPercent) => {
            const pricing = calculatePricing({
                baseTotal: cartTotal,
                availablePoints,
                usePoints: wantsPoints,
                promoPercent
            });
            if (!pricing.finalTotal || pricing.finalTotal <= 0) {
                return res.status(400).json({ error: 'Invalid amount' });
            }

            const baseUrl = buildBaseUrl(req);
            stripe.checkout.sessions.create({
                mode: 'payment',
                line_items: [
                    {
                        price_data: {
                            currency: 'sgd',
                            product_data: { name: 'Seasonal Stitch Order' },
                            unit_amount: Math.round(pricing.finalTotal * 100)
                        },
                        quantity: 1
                    }
                ],
                metadata: {
                    source: 'cart',
                    shipping_name: shippingName,
                    shipping_address: shippingAddress,
                    promo_code: promoCode || '',
                    use_points: wantsPoints ? 'true' : 'false'
                },
                success_url: `${baseUrl}/stripe/cart-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/checkout`
            })
                .then((session) => res.json({ url: session.url }))
                .catch((stripeErr) => {
                    console.error('Stripe session error:', stripeErr);
                    res.status(500).json({ error: 'Failed to create Stripe session' });
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

    cartSuccess: async (req, res) => {
        const stripe = getStripeClient();
        if (!stripe) {
            return res.status(500).send('Stripe is not configured');
        }

        try {
            const sessionId = req.query.session_id;
            if (!sessionId) return res.status(400).send('Missing session');

            const cart = req.session.cart || [];
            if (!cart.length) return res.status(400).send('Cart is empty');

            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session.payment_status !== 'paid') {
                return res.status(400).send('Payment not completed');
            }

            const metadata = session.metadata || {};
            if (metadata.source !== 'cart') {
                return res.status(400).send('Invalid session');
            }

            const shipping = {
                name: metadata.shipping_name || '',
                address: metadata.shipping_address || ''
            };

            const cartTotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
            const availablePoints = Number(req.session.user.points || 0);
            const wantsPoints = metadata.use_points === 'true';
            const promoCode = normalizePromoCode(metadata.promo_code);

            const finalizeOrder = (promoPercent) => {
                const pricing = calculatePricing({
                    baseTotal: cartTotal,
                    availablePoints,
                    usePoints: wantsPoints,
                    promoPercent
                });
                const expectedCents = Math.round(pricing.finalTotal * 100);
                if (Number(session.amount_total) !== expectedCents) {
                    return res.status(400).send('Invalid payment amount');
                }

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
                        paymentProvider: 'stripe',
                        paymentRef: session.payment_intent || session.id
                    },
                    (err, result) => {
                        if (err) return res.status(500).send('Failed to place order');
                        ensureInvoice(result.orderId, result.total, (invErr) => {
                            if (invErr) return res.status(500).send('Failed to create invoice');
                            req.session.user.points = newPoints;
                            req.session.cart = [];
                            return res.redirect(`/order-summary/${result.orderId}`);
                        });
                    }
                );
            };

            if (!promoCode) {
                return finalizeOrder(0);
            }

            PromoCode.getValidByCode(promoCode, (err, promo) => {
                if (err) return res.status(500).send('Failed to validate promo code');
                if (!promo) return res.status(400).send('Promo code is invalid or expired');
                return finalizeOrder(Number(promo.discount_percent || 0));
            });
        } catch (e) {
            console.error('Stripe success error:', e);
            return res.status(500).send('Failed to verify Stripe payment');
        }
    },

    createCheckoutSession: (req, res) => {
        const stripe = getStripeClient();
        if (!stripe) {
            return res.status(500).send('Stripe is not configured');
        }

        const orderId = req.params.orderId;
        Order.getWithItems(orderId, (err, data) => {
            if (err) return res.status(500).send('Failed to load order');
            if (!data || !data.order) return res.status(404).send('Order not found');

            const order = data.order;
            if (order.user_id !== req.session.user.user_id) {
                return res.status(403).send('Forbidden');
            }
            if (order.payment_status === 'paid') {
                return res.status(400).send('Order is already paid');
            }

            const computedTotal = data.items.reduce(
                (sum, item) => sum + Number(item.price) * Number(item.quantity),
                0
            );
            const expectedTotal = Number(order.total || 0);
            if (expectedTotal <= 0 || Math.abs(computedTotal - expectedTotal) > 0.01) {
                return res.status(400).send('Invalid order total');
            }

            const lineItems = data.items.map((item) => ({
                price_data: {
                    currency: 'sgd',
                    product_data: { name: item.name },
                    unit_amount: Math.round(Number(item.price) * 100)
                },
                quantity: Number(item.quantity)
            }));

            const baseUrl = buildBaseUrl(req);
            stripe.checkout.sessions.create({
                mode: 'payment',
                client_reference_id: String(orderId),
                payment_intent_data: { metadata: { order_id: String(orderId) } },
                line_items: lineItems,
                metadata: { order_id: String(orderId) },
                success_url: `${baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/order-summary/${orderId}`
            })
                .then((session) => res.redirect(303, session.url))
                .catch((stripeErr) => {
                    console.error('Stripe session error:', stripeErr);
                    res.status(500).send('Failed to create Stripe session');
                });
        });
    },

    success: async (req, res) => {
        const stripe = getStripeClient();
        if (!stripe) {
            return res.status(500).send('Stripe is not configured');
        }

        try {
            const sessionId = req.query.session_id;
            if (!sessionId) return res.status(400).send('Missing session');

            const session = await stripe.checkout.sessions.retrieve(sessionId);
            const orderId = session.metadata && session.metadata.order_id;
            if (!orderId) return res.status(400).send('Missing order');
            if (session.payment_status !== 'paid') {
                return res.status(400).send('Payment not completed');
            }

            Order.getWithItems(orderId, (err, data) => {
                if (err) return res.status(500).send('Failed to load order');
                if (!data || !data.order) return res.status(404).send('Order not found');
                if (data.order.user_id !== req.session.user.user_id) {
                    return res.status(403).send('Forbidden');
                }

                const expectedTotal = Number(data.order.total || 0);
                const expectedCents = Math.round(expectedTotal * 100);
                if (Number(session.amount_total) !== expectedCents) {
                    return res.status(400).send('Invalid payment amount');
                }

                Order.finalizeStripePayment(orderId, session.payment_intent || session.id, (payErr) => {
                    if (payErr) return res.status(500).send('Failed to finalize payment');
                    ensureInvoice(orderId, expectedTotal, (invErr) => {
                        if (invErr) return res.status(500).send('Failed to create invoice');
                        req.session.cart = [];
                        return res.redirect(`/order-summary/${orderId}`);
                    });
                });
            });
        } catch (e) {
            console.error('Stripe success error:', e);
            return res.status(500).send('Failed to verify Stripe payment');
        }
    },

    cancel: (req, res) => {
        res.redirect('/orders');
    }
};

module.exports = StripeController;
