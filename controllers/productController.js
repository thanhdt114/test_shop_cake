//const { response } = require('express');
const product = require('../models/product')
const category = require('../models/category');
const orderDetail = require("../models/orderDetail");
const mongoose = require('mongoose')

const catchAsyncErrors = require('../utils/catchAsyncErrors');
const pagination = require('../utils/pagination');
const order = require('../models/order');
const { findOne } = require('../models/logOrderDetail');

// Create new product   =>   /api/v1/admin/product/new
exports.createProduct = catchAsyncErrors(async (req, res, next) => {
    let newProduct = new product();
    newProduct = req.body;
    newProduct.Image = {
        Public_Id: req.file.filename,
        Url: req.file.path
    };
    if (newProduct.Quantity > 0) {
        newProduct.quantityStatus = true
    }
    newProduct.Sweet = [
        { 
            name: 'Low'
        },
        { 
            name: 'Normal'
        },
        { 
            name: 'High'
        },
    ]
    const Product = await product.create(newProduct);

    res.status(201).json({
        success: true,
        Product
    })
})

exports.getProductList = catchAsyncErrors(async (req, res, next) => {
    // const session = await mongoose.startSession()
    // session.startTransaction()
    // const pointTransaction = { session };

    // let tempProduct;
    // const Product = await product.find();
    // for (var i = 0; i < Product.length; i++) {
    //     tempProduct = await product.findOne({ _id: Product[i]._id });
    //     if (tempProduct.Quantity > 0) {
    //         tempProduct.quantityStatus = true;
    //     }
    //     else {
    //         tempProduct.quantityStatus = false;
    //     }
    //     updateCheck = await tempProduct.save(pointTransaction);
    //     if (!updateCheck) {
    //         await session.abortTransaction()
    //         session.endSession();

    //         const err = new Error('Error update field Size Product');
    //         return next(err);
    //     }
    // }

    // await session.commitTransaction()
    // session.endSession();
    // const total = Product.length;

    // res.json({
    //     success: true,
    // })
    

    const page = req.query.page;
    const total = await product.where({isDelete: false}).countDocuments();
    const Product = await pagination(
        product.find({isDelete: false}).populate("Category").sort([ ['isDelete', 1], ['quantityStatus', -1], ['Modified_At', -1] ]),
        page,
        8
    )

    res.status(201).json({
        success: true,
        total: total,
        totalCurrentPage: Product.length,
        Product
    })
})

exports.getProductById = catchAsyncErrors(async (req, res, next) => {
    const tempId = req.query.Id;
    const ObjectId = mongoose.Types.ObjectId;
    if (!tempId || !ObjectId.isValid(tempId)) {
        const err = new Error('Id id not valid');
        return next(err);
    }
    const Product = await product.findById(tempId).populate("Category");
    if (!Product || Product.isDelete == true) {
        const err = new Error('Product not found');
        return next(err);
    }
    res.status(201).json({
        success: true,
        Product
    })
})

exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
    // Validate Id
    const tempId = req.body.Id;
    const ObjectId = mongoose.Types.ObjectId;
    if (!tempId || !ObjectId.isValid(tempId)) {
        const err = new Error('Id id not valid');
        return next(err);
    }

    // Check product exists in database
    const oldProduct = await product.findById(tempId);
    if (!oldProduct || oldProduct.isDelete == true) {
        const err = new Error('Product not found');
        return next(err);
    }

    // Create template product
    const tempProduct = {
        Name: req.body.Name || oldProduct.Name,
        Description: req.body.Description || oldProduct.Description,
        Price: req.body.Price || oldProduct.Price,
        Quantity: req.body.Quantity || oldProduct.Quantity,
        Category: req.body.Category || oldProduct.Category,
        //Sweet: req.body.Sweet || oldProduct.Sweet,
        Modified_At: Date.now(),
    }
    if (tempProduct.Quantity > 0) {
        tempProduct.quantityStatus = true;
    }
    else {
        tempProduct.quantityStatus = false;
    }

    // Update product
    const Product = await product.findByIdAndUpdate(tempId, tempProduct, {
        new: true,
        runValidators: true,
        useFindAndModified: false
    }).populate("Category");
    
    res.json({
        success: true,
        message: 'Product updated',
        Product
    })
})

exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
    const tempId = req.query.Id;
    const ObjectId = mongoose.Types.ObjectId;
    if (!tempId || !ObjectId.isValid(tempId)) {
        const err = new Error('Id id not valid');
        return next(err);
    }

    let tempProduct = await product.findById(tempId).populate("Category");
    if (!tempProduct || tempProduct.isDelete == true) {
        const err = new Error('Product not found');
        return next(err);
    }

    if (tempProduct.Quantity <= 0) {

    }

    tempProduct = {
        isDelete: true,
    }
    const newProduct = await product.findByIdAndUpdate(tempId, tempProduct, {
        new: true,
        runValidators: true,
        useFindAndModified: false
    });

    res.status(201).json({
        success: true,
        message: 'Product deleted'
    })
})

exports.searchProduct = catchAsyncErrors(async (req, res, next) => {
    const tempKeyword = req.query.Keyword;
    const page = req.query.page;

    // Set keyword
    const Keyword = tempKeyword ? {
        $or: [
            {
                Name: {
                    $regex: tempKeyword,
                    $options: 'i'
                }
                
            },
            {
                Description: {
                    $regex: tempKeyword,
                    $options: 'i'
                },
            }
        ]
        
    } : {}
    
    const total = await product.where({ ...Keyword }).countDocuments();
    const Product = await pagination(
        product.find({ ...Keyword }).populate("Category").sort({ isDelete: 1, quantityStatus: -1, Modified_At: -1 }),
        page,
        8
    )

    res.status(201).json({
        success: true,
        total: total,
        totalCurrentPage: Product.length,
        Product
    })
})

exports.filterProduct = catchAsyncErrors(async (req, res, next) => {
    const nameCategory = req.query.Category;
    const page = req.query.page;

    // find category id
    const tempCategory = await category.findOne({ Name: nameCategory });

    const nameSort = req.query.Sort || '';

    // Set field and sort name
    let field = 0;
    let sort = 0;
    tempSort = ['nameasc', 'namedesc', 'priceasc', 'pricedesc']
    if(tempSort.includes(nameSort.toLowerCase())) {
        field = 'Name';
        sort = nameSort.slice(4, nameSort.length);
        if (nameSort.slice(0, 5).toLowerCase() == 'price') {
            field = 'Price';
            sort = nameSort.slice(5, nameSort.length);
        }
    }

    let Product;
    let total;

    //const tempSort = ['nameasc', 'namedesc', 'priceasc', 'pricedesc']
    //[ 'isDelete', 1 ]
    if (!tempCategory) {
        total = await product.find().sort([[ 'isDelete', 1 ], ['quantityStatus', -1], [ field, sort], [ 'Modified_At', -1 ]]).countDocuments();
        Product = await pagination(
            product.find().sort([[ 'isDelete', 1 ], ['quantityStatus', -1], [ field, sort], [ 'Modified_At', -1 ]]).populate("Category"),
            page,
            8
        )
    }
    else {
        total = await product.find({ Category: tempCategory}).sort([[ 'isDelete', 1 ], ['quantityStatus', -1], [ field, sort], [ 'Modified_At', -1 ]]).countDocuments();
        Product = await pagination(
            product.find({ Category: tempCategory}).sort([[ 'isDelete', 1 ], ['quantityStatus', -1], [ field, sort], [ 'Modified_At', -1 ]]).populate("Category"),
            page,
            8
        )
    }
    
    res.status(201).json({
        success: true,
        total: total,
        totalCurrentPage: Product.length,
        Product
    })
})

exports.getProductById_Test = catchAsyncErrors(async (req, res, next) => {
    const { _id } = req.body;

    if (_id) {
        product.findOne({ _id, isDelete: { $ne: true } })
            .populate({ path: "Category", select: "_id Name Description"})
            .exec((error, Product) => {
                if (error) {
                    return res.status(400).json({ error});
                }
                if (Product) {
                    res.status(200).json({ Product });
                }
                else {
                    res.status(400).json({ error: "something went wrong"})
                }
            })
    }
    else {
        res.status(400).json({ error: "Params required"});
    }
})

exports.disableProduct = catchAsyncErrors(async (req, res, next) => {
    // Validate Id
    const idProduct = req.query.idProduct;
    const ObjectId = mongoose.Types.ObjectId;
    if (!idProduct || !ObjectId.isValid(idProduct)) {
        const err = new Error('Id not valid');
        return next(err);
    }

    //get data
    const tempAccount = req.Account;

    // Check product exists in database
    const oldProduct = await product.findById(idProduct);
    if (!oldProduct) {
        const err = new Error('Product not found');
        return next(err);
    }

    let lenOrder = 0;
    let lenProductInOrder = 0;
    let tempOrder = await order.find({ Order_Status: 'order', isDelete: false })
    lenOrder = tempOrder.length || 0;
    for (var i = 0; i < lenOrder; i++) {
        lenProductInOrder = tempOrder[i].products.length || 0;
        for (var j = 0; j < lenProductInOrder; j++) {
            if (tempOrder[i].products[j]._id == idProduct) {
                const err = new Error('The product being ordered cannot be disabled');
                return next(err);
            }
        }
    }

    tempOrder = await order.find({ Order_Status: 'order', isDelete: false })
    lenOrder = tempOrder.length || 0;
    for (var i = 0; i < lenOrder; i++) {
        lenProductInOrder = tempOrder[i].products.length || 0;
        for (var j = 0; j < lenProductInOrder; j++) {
            if (tempOrder[i].products[j]._id == idProduct) {
                const err = new Error('The product being ordered cannot be disabled');
                return next(err);
            }
        }
    }

    // Update isDelete is true
    const tempProduct = {
        Name: oldProduct.Name,
        Description: oldProduct.Description,
        Price: oldProduct.Price,
        Quantity: oldProduct.Quantity,
        Category: oldProduct.Category,
        Size: oldProduct.Size,
        Modified_At: Date.now(),
        isDelete: true,
    }

    // Update product
    const Product = await product.findByIdAndUpdate(idProduct, tempProduct, {
        new: true,
        runValidators: true,
        useFindAndModified: false
    }).populate("Category");
    
    res.json({
        success: true,
        message: 'Disable product',
        Product
    })
})

exports.enableProduct = catchAsyncErrors(async (req, res, next) => {
    // Validate Id
    const idProduct = req.query.idProduct;
    const ObjectId = mongoose.Types.ObjectId;
    if (!idProduct || !ObjectId.isValid(idProduct)) {
        const err = new Error('Id not valid');
        return next(err);
    }

    // Check product exists in database
    const oldProduct = await product.findById(idProduct);
    if (!oldProduct) {
        const err = new Error('Product not found');
        return next(err);
    }

    // Update isDelete is false
    const tempProduct = {
        Name: oldProduct.Name,
        Description: oldProduct.Description,
        Price: oldProduct.Price,
        Quantity: oldProduct.Quantity,
        Category: oldProduct.Category,
        Size: oldProduct.Size,
        Modified_At: Date.now(),
        isDelete: false,
    }

    // Update product
    const Product = await product.findByIdAndUpdate(idProduct, tempProduct, {
        new: true,
        runValidators: true,
        useFindAndModified: false
    }).populate("Category");
    
    res.json({
        success: true,
        message: 'Enable product',
        Product
    })
})

exports.getProductDisableList = catchAsyncErrors(async (req, res, next) => {
    const page = req.query.page;
    const total = await product.where({isDelete: true}).countDocuments();
    const Product = await pagination(
        product.find({isDelete: true})
            .populate("Category")
            .sort({ isDelete: 1, quantityStatus: -1, Modified_At: -1 }),
        page,
        8
    )

    res.status(201).json({
        success: true,
        total: total,
        totalCurrentPage: Product.length,
        Product
    })
})