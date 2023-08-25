const { request } = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const schema = mongoose.Schema;

const accountSchema = new schema({
    FullName: {
        type: String,
        request: true,
        default: null
    },
    Email: {
        type: String,
        request: true,
        unique: true,
        default: null
    },
    Password: {
        type: String,
        request: true,
        default: null,
        select: false
    },      
    Role: {
        type: String,
        default: 'user'
    }, 
    
    Address: {
        type: String,
        default: null
    },
    Phone: {
        type: String,
        default: null
    },
    Cart : [
        {
            productId: String,
            productName: String,
            productImage: String,
            productPrice: Number,
            productQuantity: Number,
            productSweet: String,
            quantityInStock: Number,
            isDelete: String
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
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
        
})

accountSchema.pre('save', async function(next) {
    if(!this.isModified('Password')) {
        next();
    }

    this.Password = await bcrypt.hash(this.Password, 10);
})

accountSchema.methods.getJwtToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_TIME
    })
}

accountSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.Password);
}

accountSchema.methods.getResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000

    return resetToken;
}

module.exports = mongoose.model('Account', accountSchema);