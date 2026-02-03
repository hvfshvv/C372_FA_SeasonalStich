const path = require("path");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
require("dotenv").config();

const ProductController = require("./Controllers/ProductController");
const UserController = require("./Controllers/UserController");
const CartController = require("./Controllers/CartController");
const OrderController = require("./Controllers/OrderController");
const AdminController = require("./Controllers/AdminController");
const ReportController = require("./Controllers/ReportController");
const ReviewController = require("./Controllers/ReviewController");
const paymentRoutes = require("./routes/paymentRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const footerStore = require("./utils/footerStore");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "Views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "seasonalstitch_secret",
    resave: false,
    saveUninitialized: false
  })
);
app.use(express.static(path.join(__dirname, "Public")));

// Expose common locals for views (user, cart count, active page)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  const cart = req.session.cart || [];
  res.locals.cartCount = cart.reduce((count, item) => count + item.quantity, 0);
  res.locals.cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.quantity,
    0
  );

  let active = "";
  if (res.locals.user && res.locals.user.role === "admin") {
    if (req.path.startsWith("/admin/dashboard")) active = "dashboard";
    else if (req.path.startsWith("/admin/orders")) active = "orders";
    else if (req.path.startsWith("/inventory")) active = "inventory";
    else if (req.path.startsWith("/admin/users")) active = "users";
    else if (req.path.startsWith("/admin/reports")) active = "reports";
  } else {
    if (req.path === "/" || req.path.startsWith("/shop")) active = "shop";
    else if (req.path.startsWith("/cart")) active = "cart";
    else if (req.path.startsWith("/checkout")) active = "cart";
    else if (req.path.startsWith("/orders")) active = "orders";
    else if (req.path.startsWith("/login") || req.path.startsWith("/register")) active = "auth";
  }
  res.locals.activePage = active;
  res.locals.footer = footerStore.get();
  next();
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "Public", "images"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_-]/gi, "");
    const safeBase = base ? base.slice(0, 40) : "upload";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBase}-${unique}${ext}`);
  }
});
const upload = multer({ storage });

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  if (req.session.user.role !== "admin") {
    return res.status(403).send("Forbidden");
  }
  return next();
};

const requireCustomer = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  if (req.session.user.role === "admin") {
    return res.redirect("/admin/dashboard");
  }
  return next();
};

app.get("/", ProductController.list);

app.get("/login", (req, res) => res.render("login"));
app.get("/loginUser", (req, res) => res.redirect("/login"));
app.post("/login", UserController.login);
app.get("/register", (req, res) => res.render("register"));
app.post("/register", UserController.register);
app.get("/logout", UserController.logout);

app.get("/addHoodie", requireAdmin, (req, res) => {
  res.render("add", { user: req.session.user });
});
app.post("/addHoodie", requireAdmin, upload.single("image"), ProductController.add);
app.get("/editHoodie/:id", requireAdmin, ProductController.getById);
app.post(
  "/editHoodie/:id",
  requireAdmin,
  upload.single("image"),
  ProductController.update
);
app.get("/deleteHoodie/:id", requireAdmin, ProductController.delete);

app.get("/cart", requireCustomer, CartController.viewCart);
app.post("/cart/add/:id", requireCustomer, CartController.addItem);
app.post("/cart/update/:id", requireCustomer, CartController.updateQuantity);
app.post("/cart/remove/:id", requireCustomer, CartController.removeItem);
app.post("/cart/clear", requireCustomer, CartController.clearCart);

app.get("/checkout", requireCustomer, OrderController.checkoutPage);
app.post("/checkout/promo", requireCustomer, OrderController.applyPromo);
app.post("/checkout", requireCustomer, OrderController.placeOrder);
app.post("/checkout/paypal-complete", requireCustomer, OrderController.placeOrderPaypal);
app.get("/checkout-success/:id", requireCustomer, OrderController.checkoutSuccess);
app.get("/order-summary/:id", requireAuth, OrderController.summaryByOrderId);
app.get("/invoice/:id/view", requireAuth, OrderController.invoicePage);
app.get("/invoice/:id", requireAuth, OrderController.invoicePdf);
app.get("/track/:id", requireAuth, OrderController.trackingPage);
app.get("/orders", requireCustomer, OrderController.history);
app.post("/orders/:id/refund", requireCustomer, OrderController.requestRefund);
app.post("/reviews/:orderId/:hoodieId", requireCustomer, ReviewController.submit);

app.get("/admin/orders", requireAdmin, OrderController.adminHistory);
app.post("/admin/orders/:id/status", requireAdmin, OrderController.updateStatus);
app.post("/admin/orders/:id/refund", requireAdmin, OrderController.resolveRefund);
app.post("/admin/orders/:id/tracking", requireAdmin, OrderController.updateTracking);
app.get("/admin/dashboard", requireAdmin, AdminController.dashboard);
app.post("/admin/restock/:id", requireAdmin, AdminController.restockHoodie);
app.get("/inventory", requireAdmin, AdminController.inventoryPage);
app.get("/admin/categories", requireAdmin, AdminController.categoriesPage);
app.get("/admin/reports", requireAdmin, ReportController.adminReport);
app.get("/admin/users", requireAdmin, AdminController.usersPage);
app.post("/admin/users/:id/points", requireAdmin, AdminController.updateUserPoints);
app.get("/admin/footer", requireAdmin, (req, res) => {
  res.render("footer-edit", { user: req.session.user, footer: footerStore.get() });
});
app.post("/admin/footer", requireAdmin, (req, res) => {
  footerStore.update({
    instagram: req.body.instagram && req.body.instagram.trim(),
    facebook: req.body.facebook && req.body.facebook.trim(),
    email: req.body.email && req.body.email.trim(),
    phone: req.body.phone && req.body.phone.trim()
  });
  res.redirect("/admin/footer");
});

app.use("/paypal", requireCustomer, paymentRoutes);
app.use("/stripe", requireCustomer, stripeRoutes);

app.listen(PORT, () => {
  console.log(`Seasonal Stitch running on port ${PORT}`);
});
