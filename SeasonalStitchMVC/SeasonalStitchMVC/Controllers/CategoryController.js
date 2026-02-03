const Category = require('../Models/Category');

const CategoryController = {
    list: (req, res) => {
        Category.getAll((err, categories) => {
            if (err) return res.status(500).send('Error loading categories');
            res.json(categories);
        });
    },

    get: (req, res) => {
        const id = req.params.id;
        Category.getById(id, (err, category) => {
            if (err) return res.status(500).send('Error retrieving category');
            if (!category) return res.status(404).send('Category not found');
            res.json(category);
        });
    },

    add: (req, res) => {
        const { name } = req.body;
        if (!name) return res.status(400).send('Name is required');
        Category.add(name, (err) => {
            if (err) return res.status(500).send('Failed to create category');
            res.redirect('/admin/categories');
        });
    },

    update: (req, res) => {
        const id = req.params.id;
        const { name } = req.body;
        if (!name) return res.status(400).send('Name is required');
        Category.update(id, name, (err) => {
            if (err) return res.status(500).send('Failed to update category');
            res.redirect('/admin/categories');
        });
    },

    delete: (req, res) => {
        const id = req.params.id;
        Category.delete(id, (err) => {
            if (err) return res.status(500).send('Failed to delete category');
            res.redirect('/admin/categories');
        });
    }
};

module.exports = CategoryController;
