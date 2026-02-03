const express = require('express');
const router = express.Router();
const StripeController = require('../Controllers/StripeController');

router.post('/checkout-session/:orderId', StripeController.createCheckoutSession);
router.get('/success', StripeController.success);
router.post('/cart-session', StripeController.createCartSession);
router.get('/cart-success', StripeController.cartSuccess);
router.get('/cancel', StripeController.cancel);

module.exports = router;
