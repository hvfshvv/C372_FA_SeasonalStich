const Hoodie = require('../Models/Hoodie');
const SavedCart = require('../Models/SavedCart');

const ensureCart = (req) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    return req.session.cart;
};

const persistCartIfLoggedIn = (req) => {
    if (!req.session || !req.session.user) return;
    const cart = req.session.cart || [];
    SavedCart.saveForUser(req.session.user.user_id, cart, (err) => {
        if (err) {
            console.error('Failed to persist cart:', err);
        }
    });
};

const getTotals = (cart) => {
    return cart.reduce(
        (totals, item) => {
            totals.items += item.quantity;
            totals.total += Number(item.price) * item.quantity;
            return totals;
        },
        { items: 0, total: 0 }
    );
};

const CartController = {
    viewCart: (req, res) => {
        const cart = ensureCart(req);
        const totals = getTotals(cart);
        res.render('cart', { cart, totals, user: req.session.user });
    },

    addItem: (req, res) => {
        const hoodieId = req.params.id;
        const quantity = parseInt(req.body.quantity, 10) || 1;

        Hoodie.getById(hoodieId, (err, hoodie) => {
            if (err) return res.status(500).send('Unable to add item to cart');
            if (!hoodie) return res.status(404).send('Hoodie not found');

            const cart = ensureCart(req);
            const existing = cart.find(item => item.hoodie_id === hoodie.hoodie_id);

            if (existing) {
                existing.quantity += quantity;
            } else {
                cart.push({
                    hoodie_id: hoodie.hoodie_id,
                    name: hoodie.name,
                    price: hoodie.price,
                    image_url: hoodie.image_url,
                    quantity
                });
            }

            persistCartIfLoggedIn(req);
            res.redirect('/cart');
        });
    },

    updateQuantity: (req, res) => {
        const hoodieId = parseInt(req.params.id, 10);
        const quantity = parseInt(req.body.quantity, 10);
        const cart = ensureCart(req);

        const item = cart.find(entry => entry.hoodie_id === hoodieId);
        if (!item) return res.status(404).send('Item not found in cart');

        if (Number.isNaN(quantity) || quantity <= 0) {
            req.session.cart = cart.filter(entry => entry.hoodie_id !== hoodieId);
        } else {
            item.quantity = quantity;
        }

        persistCartIfLoggedIn(req);
        res.redirect('/cart');
    },

    removeItem: (req, res) => {
        const hoodieId = parseInt(req.params.id, 10);
        const cart = ensureCart(req);
        req.session.cart = cart.filter(item => item.hoodie_id !== hoodieId);
        persistCartIfLoggedIn(req);
        res.redirect('/cart');
    },

    clearCart: (req, res) => {
        req.session.cart = [];
        persistCartIfLoggedIn(req);
        res.redirect('/cart');
    }
};

module.exports = CartController;
