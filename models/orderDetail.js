
const { request } = require('express');
const mongoose = require('mongoose')
const schema = mongoose.Schema;

const orderDetailSchema = new schema({
    Order: {
        type: schema.ObjectId,
        ref: 'Order',
        required: true,  
    },
    Product: {
        type: schema.ObjectId,
        ref: 'Product',
        required: true,  
    },
    Price: {
        type: Number,
        default: null
    },
    Quantity: {
        type: Number,
        default: null
    },
    Product_Size: {
        type: String,
        default: null
    },
    Created_At: {
        type: Date,
        default: Date.now()
    },
    Modified_At: {
        type: Date,
        default: Date.now()
    },
    isDelete: {
        type: Boolean,
        default: 0
    }      
})

module.exports = mongoose.model('OrderDetail', orderDetailSchema);