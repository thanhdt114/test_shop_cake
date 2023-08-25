
const { request } = require('express');
const rollback = require('mongoose-rollback');
const mongoose = require('mongoose')
const schema = mongoose.Schema;

const logOrderDetailSchema = new schema({
    Order: {
        type: schema.ObjectId,
        ref: 'Order',
    },
    Product: {
        type: schema.ObjectId,
        ref: 'Product',
        required: true,  
    },
    Account: {
        type: schema.ObjectId,
        ref: 'Account',
        required: true,  
    },
    Quantity: {
        type: Number,
        default: null
    },
    Product_Sweet: {
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

// logOrderDetailSchema.plugin(rollback, {
//     index: true, // index on _version field
//     conn: process.env.DATABASE_URL, // required if connection isn't explict
//     collectionName: 'LogOrderDetail' // your collection name or custom collection
// });

module.exports = mongoose.model('LogOrderDetail', logOrderDetailSchema);