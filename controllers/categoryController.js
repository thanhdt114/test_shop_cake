const category = require('../models/category');
const catchAsyncErrors = require('../utils/catchAsyncErrors');
const mongoose = require('mongoose')

exports.getCategoryList = catchAsyncErrors(async (req, res, next) => {
    const Category = await category.find({ isDelete: false });
    const total = Category.length;
    res.status(201).json({
        success: true,
        total: total,
        Category
    })
})

exports.getCategoryById = catchAsyncErrors(async (req, res, next) => {
    const tempId = req.query.Id;
    const ObjectId = mongoose.Types.ObjectId;
    if (!tempId || !ObjectId.isValid(tempId)) {
        const err = new Error('Id id not valid');
        return next(err);
    }
    const Category = await category.findById(tempId);
    if (!Category || Category.isDelete == true) {
        const err = new Error('Category not found');
        return next(err);
    }
    res.status(201).json({
        success: true,
        Category
    })
})

// Create new product   =>   /api/v1/admin/product/new
exports.createCategory = catchAsyncErrors(async (req, res, next) => {
    let newCategory = new category;
    newCategory = req.body;
    const Category = await category.create(newCategory);

    res.status(201).json({
        success: true,
        Category
    })
})

exports.updateCategory = catchAsyncErrors(async (req, res, next) => {
    const newCategory = req.body;

    const ObjectId = mongoose.Types.ObjectId;
    if (!newCategory.idCategory || !ObjectId.isValid(newCategory.idCategory)) {
        const err = new Error('Id id not valid');
        return next(err);
    }

    let tempCategory = new category();
    tempCategory = await category.findById(newCategory.idCategory);
    if (!tempCategory || tempCategory.isDelete == true) {
        const err = new Error('Category not found');
        return next(err);
    }

    tempCategory.Name = newCategory.Name || tempCategory.Name;
    tempCategory.Description = newCategory.Description || tempCategory.Description;
    tempCategory.Modified_At = Date.now();
    
    const Category = await category.findByIdAndUpdate(newCategory.idCategory, tempCategory, {
        new: true,
        runValidators: true,
        useFindAndModified: false
    });

    res.status(201).json({
        success: true,
        Category: Category
    })
})

exports.deleteCategory = catchAsyncErrors(async (req, res, next) => {
    const categoryId = req.query.categoryId;
    const ObjectId = mongoose.Types.ObjectId;
    if (!categoryId || !ObjectId.isValid(categoryId)) {
        const err = new Error('Id id not valid');
        return next(err);
    }

    let tempCategory = await category.findById(categoryId);
    if (!tempCategory || tempCategory.isDelete == true) {
        const err = new Error('Category not found');
        return next(err);
    }

    tempCategory.isDelete = true;
    
    const newCategory = await category.findByIdAndUpdate(categoryId, tempCategory, {
        new: true,
        runValidators: true,
        useFindAndModified: false
    });

    res.status(201).json({
        success: true,
        message: 'Category deleted'
    })
})