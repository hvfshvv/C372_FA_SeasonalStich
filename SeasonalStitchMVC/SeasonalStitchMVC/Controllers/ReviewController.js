const Order = require('../Models/Order');
const Review = require('../Models/Review');

const ReviewController = {
    submit: (req, res) => {
        const orderId = req.params.orderId;
        const hoodieId = req.params.hoodieId;
        const ratingRaw = parseInt(req.body.rating, 10);
        const reviewText = (req.body.review_text || '').trim();

        if (!orderId || !hoodieId || Number.isNaN(ratingRaw) || ratingRaw < 1 || ratingRaw > 5) {
            return res.status(400).send('Invalid review data');
        }

        Order.getOrderItemForUser(orderId, hoodieId, req.session.user.user_id, (err, orderItem) => {
            if (err) return res.status(500).send('Failed to validate order');
            if (!orderItem) return res.status(403).send('Forbidden');
            if (orderItem.status !== 'delivered') {
                return res.status(400).send('Reviews are available after delivery');
            }

            Review.upsert(
                {
                    user_id: req.session.user.user_id,
                    order_id: orderId,
                    hoodie_id: hoodieId,
                    rating: ratingRaw,
                    review_text: reviewText
                },
                (revErr) => {
                    if (revErr) return res.status(500).send('Failed to submit review');
                    return res.redirect(`/order-summary/${orderId}`);
                }
            );
        });
    }
};

module.exports = ReviewController;
