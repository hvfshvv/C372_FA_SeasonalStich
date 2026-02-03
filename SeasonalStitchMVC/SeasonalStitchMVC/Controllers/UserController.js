const User = require('../Models/User');
const SavedCart = require('../Models/SavedCart');

const mergeCarts = (sessionCart, savedCart) => {
    const merged = [...(sessionCart || [])];
    savedCart.forEach((item) => {
        const existing = merged.find((c) => c.hoodie_id === item.hoodie_id);
        if (existing) {
            existing.quantity += Number(item.quantity || 0);
            // keep latest price from saved cart
            existing.price = item.price;
        } else {
            merged.push({
                hoodie_id: item.hoodie_id,
                name: item.name || '',
                price: item.price,
                image_url: item.image_url || '',
                quantity: Number(item.quantity || 1)
            });
        }
    });
    return merged;
};

const UserController = {
    register: (req, res) => {
        const { full_name, email, password } = req.body;
        User.register(full_name, email, password, (err) => {
            if (err) return res.render('register', { error: 'Registration failed' });
            res.redirect('/login');
        });
    },

    login: (req, res) => {
        const { email, password } = req.body;
        User.authenticate(email, password, (err, user) => {
            if (err) return res.render('login', { error: 'Server error' });
            if (!user) return res.render('login', { error: 'Invalid email or password' });
            delete user.password;
            req.session.user = user;

            const finish = () => {
                if (user.role === 'admin') {
                    return res.redirect('/admin/dashboard');
                }
                return res.redirect('/');
            };

            SavedCart.getByUser(user.user_id, (cartErr, savedCart) => {
                if (cartErr) {
                    console.error('Failed to load saved cart:', cartErr);
                    return finish();
                }
                const merged = mergeCarts(req.session.cart || [], savedCart || []);
                req.session.cart = merged;
                SavedCart.saveForUser(user.user_id, merged, (saveErr) => {
                    if (saveErr) {
                        console.error('Failed to persist merged cart:', saveErr);
                    }
                    return finish();
                });
            });
        });
    },

    logout: (req, res) => {
        req.session.destroy(() => res.redirect('/'));
    }
};

module.exports = UserController;
