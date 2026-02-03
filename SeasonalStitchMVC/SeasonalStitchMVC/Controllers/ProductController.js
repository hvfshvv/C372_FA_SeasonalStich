const Hoodie = require('../Models/Hoodie');

const ProductController = {
    list: (req, res) => {
        Hoodie.getAll((err, hoodies) => {
            if (err) return res.status(500).send('Error loading products');
            const cart = req.session.cart || [];
            const cartMap = cart.reduce((acc, item) => {
                acc[item.hoodie_id] = (acc[item.hoodie_id] || 0) + Number(item.quantity || 0);
                return acc;
            }, {});

            const decorated = (hoodies || []).map((hoodie) => {
                const originalStock = Number(hoodie.stock || 0);
                const reserved = Number(cartMap[hoodie.hoodie_id] || 0);
                const available = Math.max(0, originalStock - reserved);
                return {
                    ...hoodie,
                    stock: available,
                    image_url: hoodie.image_url ? hoodie.image_url.replace(/^\/?images\//i, '') : '',
                    lowStock: available <= 5
                };
            });
            const q = (req.query.q || '').trim().toLowerCase();
            const seasonFilter = (req.query.season || '').trim();
            const availability = (req.query.availability || '').trim();
            const priceMin = Number(req.query.price_min || '');
            const priceMax = Number(req.query.price_max || '');

            const filtered = decorated.filter((hoodie) => {
                const matchesText =
                    !q ||
                    hoodie.name.toLowerCase().includes(q) ||
                    (hoodie.description || '').toLowerCase().includes(q);
                const matchesSeason = !seasonFilter || hoodie.season === seasonFilter;
                const stockNum = Number(hoodie.stock || 0);
                let matchesAvailability = true;
                if (availability === 'in_stock') matchesAvailability = stockNum > 0;
                if (availability === 'low_stock') matchesAvailability = hoodie.lowStock && stockNum > 0;
                if (availability === 'out_of_stock') matchesAvailability = stockNum === 0;

                const priceNum = Number(hoodie.price || 0);
                const matchesMin = Number.isNaN(priceMin) || !priceMin ? true : priceNum >= priceMin;
                const matchesMax = Number.isNaN(priceMax) || !priceMax ? true : priceNum <= priceMax;

                return matchesText && matchesSeason && matchesAvailability && matchesMin && matchesMax;
            });
            const cartCount = (req.session.cart || []).reduce((count, item) => count + item.quantity, 0);
            res.render('index', {
                hoodies: filtered,
                user: req.session.user,
                cartCount,
                search: {
                    q: req.query.q || '',
                    season: seasonFilter,
                    availability,
                    price_min: req.query.price_min || '',
                    price_max: req.query.price_max || ''
                }
            });
        });
    },

    getById: (req, res) => {
        const id = req.params.id;
        Hoodie.getById(id, (err, hoodie) => {
            if (err || !hoodie) return res.status(404).send('Hoodie not found');
            const hoodieData = {
                ...hoodie,
                image_url: hoodie.image_url ? hoodie.image_url.replace(/^\/?images\//i, '') : ''
            };
            res.render('update', { hoodie: hoodieData, user: req.session.user });
        });
    },

    add: (req, res) => {
        const data = {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            image_url: req.file ? req.file.filename : null,
            stock: req.body.stock,
            season: req.body.season
        };

        Hoodie.add(data, (err) => {
            if (err) return res.status(500).send('Failed to add hoodie');
            res.redirect('/');
        });
    },

    update: (req, res) => {
        const id = req.params.id;
        const data = {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            image_url: req.file ? req.file.filename : req.body.currentImage,
            stock: req.body.stock,
            season: req.body.season
        };

        Hoodie.update(id, data, (err) => {
            if (err) return res.status(500).send('Update failed');
            res.redirect('/');
        });
    },

    delete: (req, res) => {
        const id = req.params.id;
        Hoodie.delete(id, (err) => {
            if (err) return res.status(500).send('Delete failed');
            res.redirect('/');
        });
    }
};

module.exports = ProductController;
