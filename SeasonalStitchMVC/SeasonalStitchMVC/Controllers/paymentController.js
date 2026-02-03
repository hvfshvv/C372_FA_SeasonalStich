const { client, paypal } = require("../config/paypal");
const PromoCode = require("../Models/PromoCode");
const { calculatePricing } = require("../utils/pricing");

// 1) Create order
exports.createOrder = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const cart = req.session.cart || [];
    const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const usePoints = req.body && (req.body.use_points === true || req.body.use_points === "true");
    const promoCode = (req.body && req.body.promo_code ? String(req.body.promo_code) : "").trim().toUpperCase();
    const availablePoints = Number(req.session.user.points || 0);

    let promoPercent = 0;
    if (promoCode) {
      promoPercent = await new Promise((resolve, reject) => {
        PromoCode.getValidByCode(promoCode, (err, promo) => {
          if (err) return reject(err);
          if (!promo) return resolve(null);
          return resolve(Number(promo.discount_percent || 0));
        });
      });
      if (promoPercent === null) {
        return res.status(400).json({ error: "Promo code is invalid or expired" });
      }
    }

    const pricing = calculatePricing({
      baseTotal: total,
      availablePoints,
      usePoints,
      promoPercent
    });
    const value = pricing.finalTotal;

    if (!value || value <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");

    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "SGD",
            value: value.toFixed(2),
          },
        },
      ],
    });

    const order = await client().execute(request);
    return res.json({ id: order.result.id });
  } catch (e) {
    console.error("PayPal createOrder error:", e);
    return res.status(500).json({ error: "Failed to create order" });
  }
};

// 2) Capture order
exports.captureOrder = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { orderID } = req.body;
    if (!orderID) return res.status(400).json({ error: "Missing orderID" });

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const capture = await client().execute(request);
    const captureId =
      capture &&
      capture.result &&
      capture.result.purchase_units &&
      capture.result.purchase_units[0] &&
      capture.result.purchase_units[0].payments &&
      capture.result.purchase_units[0].payments.captures &&
      capture.result.purchase_units[0].payments.captures[0] &&
      capture.result.purchase_units[0].payments.captures[0].id;
    return res.json({ capture: capture.result, captureId });
  } catch (e) {
    console.error("PayPal captureOrder error:", e);
    return res.status(500).json({ error: "Failed to capture order" });
  }
};
