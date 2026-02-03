const express = require("express");
const router = express.Router();
const paymentController = require("../Controllers/paymentController");

router.post("/create-order", paymentController.createOrder);
router.post("/capture-order", paymentController.captureOrder);

module.exports = router;
