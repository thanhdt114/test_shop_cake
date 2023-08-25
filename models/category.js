const { request } = require('express');
const mongoose = require('mongoose')
const schema = mongoose.Schema;

const categorySchema = new schema({
    Name: {
        type: String,
        request: true,
        default: null
    },
    Description: {
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

module.exports = mongoose.model('Category', categorySchema);