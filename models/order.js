
const { request } = require('express');
const mongoose = require('mongoose')
const schema = mongoose.Schema;
const Product = require("../models/product");

const orderSchema = new schema({
    Account: {
        type: schema.ObjectId,
        ref: 'Account',
        required: true,  
    },
    Amount: {
        type: Number,
        default: null
    },
    Order_Email: {
        type: String,
        default: null
    },
    Order_FullName: {
        type: String,
        default: null
    }, 
    Order_Address: {
        type: String,
        default: null
    },
    Order_Phone: {
        type: String,
        default: null
    },    
    Order_Date: {
        type: Date,
        default: null
    }, 
    Order_Status: {
        type: String,
        default: 'await'
    },
    Payment_Type: {
        type: String,
        default: 'cash'
    },
    Payment_Status: {
        type: String,
        default: 'unpaid'
    },
    // products : {
    //     type: [Product.schema]  
    // },
    products : [
        {
            _id: String,
            Name: String,
            Image: String,
            Price: Number,
            Quantity: Number,
            Sweet: String
        }
    ],
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

module.exports = mongoose.model('Order', orderSchema);