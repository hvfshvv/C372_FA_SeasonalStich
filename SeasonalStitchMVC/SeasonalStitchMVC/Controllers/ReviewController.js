const Order = require('../Models/Order');
const Review = require('../Models/Review');

const TAGS = ['Product Quality', 'True to product images', 'Fabric Material', 'Comfort'];
const FIT_OPTIONS = ['Very small', 'Small', 'True to Size', 'Large', 'Very Large'];

const normalizeTags = (tags) => {
    if (!Array.isArray(tags)) return [];
    return tags
        .map((t) => String(t || '').trim())
        .filter((t) => TAGS.includes(t));
};

const ReviewController = {
    submit: (req, res) => {
        const orderId = req.params.orderId;
        const hoodieId = req.params.hoodieId;
        const ratingRaw = parseInt(req.body.rating, 10);
        const reviewText = (req.body.review_text || '').trim();
        const tags = normalizeTags(req.body.tags);
        const overallFit = (req.body.overall_fit || '').trim();

        if (!orderId || !hoodieId || Number.isNaN(ratingRaw) || ratingRaw < 1 || ratingRaw > 5) {
            return res.status(400).send('Invalid review data');
        }

        Order.getOrderItemForUser(orderId, hoodieId, req.session.user.user_id, (err, orderItem) => {
            if (err) return res.status(500).send('Failed to validate order');
            if (!orderItem) return res.status(403).send('Forbidden');
            if (orderItem.status !== 'delivered') {
                return res.status(400).send('Reviews are available after delivery');
            }

            const row = {
                hoodie_id: hoodieId,
                rating: ratingRaw,
                review_text: reviewText,
                tags: tags.length ? tags.join(',') : null,
                overall_fit: FIT_OPTIONS.includes(overallFit) ? overallFit : null
            };

            Review.insertManyWithReward(
                req.session.user.user_id,
                orderId,
                [row],
                (revErr) => {
                    if (revErr) return res.status(500).send('Failed to submit review');
                    return res.redirect(`/order-summary/${orderId}`);
                }
            );
        });
    },

    reviewPage: (req, res) => {
        const orderId = req.params.orderId;
        if (!req.session.user) return res.redirect('/login');

        Order.getWithItems(orderId, (err, data) => {
            if (err) return res.status(500).send('Failed to load order');
            if (!data || !data.order) return res.status(404).send('Order not found');
            if (data.order.user_id !== req.session.user.user_id) {
                return res.status(403).send('Forbidden');
            }
            if ((data.order.status || '').toLowerCase() !== 'delivered') {
                return res.status(400).send('Reviews are available after delivery');
            }

            const uniqueProducts = [];
            const seen = new Set();
            (data.items || []).forEach((item) => {
                const id = item.hoodie_id;
                if (seen.has(id)) return;
                seen.add(id);
                uniqueProducts.push({
                    hoodie_id: id,
                    name: item.name,
                    image_url: item.image_url
                });
            });

            Review.getByOrderForUser(orderId, req.session.user.user_id, (revErr, reviews) => {
                if (revErr) return res.status(500).send('Failed to load reviews');
                const reviewMap = (reviews || []).reduce((acc, review) => {
                    acc[review.hoodie_id] = review;
                    return acc;
                }, {});
                res.render('reviews', {
                    user: req.session.user,
                    order: data.order,
                    products: uniqueProducts,
                    existingReviews: reviewMap,
                    tags: TAGS,
                    fitOptions: FIT_OPTIONS
                });
            });
        });
    },

    submitBatch: (req, res) => {
        const orderId = req.params.orderId;
        if (!req.session.user) return res.redirect('/login');

        Order.getWithItems(orderId, (err, data) => {
            if (err) return res.status(500).send('Failed to load order');
            if (!data || !data.order) return res.status(404).send('Order not found');
            if (data.order.user_id !== req.session.user.user_id) {
                return res.status(403).send('Forbidden');
            }
            if ((data.order.status || '').toLowerCase() !== 'delivered') {
                return res.status(400).send('Reviews are available after delivery');
            }

            let payload = req.body.reviews_payload;
            if (typeof payload === 'string') {
                try {
                    payload = JSON.parse(payload);
                } catch (e) {
                    return res.status(400).send('Invalid review payload');
                }
            }
            if (!Array.isArray(payload)) {
                return res.status(400).send('Invalid review payload');
            }

            const itemSet = new Set((data.items || []).map((item) => String(item.hoodie_id)));
            Review.getByOrderForUser(orderId, req.session.user.user_id, (revErr, reviews) => {
                if (revErr) return res.status(500).send('Failed to load reviews');
                const reviewed = new Set((reviews || []).map((r) => String(r.hoodie_id)));

                const rows = payload
                    .map((entry) => ({
                        hoodie_id: String(entry.hoodie_id || ''),
                        rating: parseInt(entry.rating, 10),
                        tags: normalizeTags(entry.tags).join(','),
                        overall_fit: String(entry.overall_fit || ''),
                        review_text: String(entry.notes || '').trim()
                    }))
                    .filter((entry) => {
                        if (!entry.hoodie_id || !itemSet.has(entry.hoodie_id)) return false;
                        if (reviewed.has(entry.hoodie_id)) return false;
                        if (Number.isNaN(entry.rating) || entry.rating < 1 || entry.rating > 5) return false;
                        return true;
                    })
                    .map((entry) => ({
                        hoodie_id: entry.hoodie_id,
                        rating: entry.rating,
                        review_text: entry.review_text,
                        tags: entry.tags || null,
                        overall_fit: FIT_OPTIONS.includes(entry.overall_fit) ? entry.overall_fit : null
                    }));

                Review.insertManyWithReward(
                    req.session.user.user_id,
                    orderId,
                    rows,
                    (insErr) => {
                        if (insErr) return res.status(500).send('Failed to submit reviews');
                        return res.redirect('/reviews/submitted');
                    }
                );
            });
        });
    },

    submitted: (req, res) => {
        res.render('review_submitted', { user: req.session.user });
    }
};

module.exports = ReviewController;
