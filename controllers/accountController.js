
const crypto = require('crypto');

const account = require('../models/account');
const catchAsyncErrors = require('../utils/catchAsyncErrors');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const pagination = require('../utils/pagination');

const mongoose = require('mongoose')

// Create new product   =>   /api/v1/admin/product/new
exports.registerAccount = catchAsyncErrors(async (req, res, next) => {
    const { FullName, Email, Password } = req.body;

    let newAccount = new account;
    newAccount = {
        FullName: FullName,
        Email: Email,
        Password: Password,      
    }
    const Account = await account.create(newAccount);

    sendToken(Account, res);
})

// exports.updateAccount = catchAsyncErrors(async (req, res, next) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     const pointTransaction = { session };

//     // Validate Id
//     const { idOrder, Amount, Order_FullName, Order_Address, 
//               Order_Phone, Order_Status, Payment_Type, Payment_Status } = req.body;
//     const ObjectId = mongoose.Types.ObjectId;
//     if (!idOrder || !ObjectId.isValid(idOrder)) {
//         const err = new Error('Id id not valid');
//         return next(err);
//     }
  
//     // Check product exists in database
//     const tempOrder = await order.findById(idOrder);
//     if (!tempOrder || tempOrder.isDelete == true) {
//         const err = new Error('Product not found');
//         return next(err);
//     }
  
//     // SET values in order
//     tempOrder.Amount = Amount || tempOrder.Amount;
//     tempOrder.Order_FullName = Order_FullName || tempOrder.Order_FullName;
//     tempOrder.Order_Address = Order_Address || tempOrder.Order_Address;
//     tempOrder.Order_Phone = Order_Phone || tempOrder.Order_Phone;
//     tempOrder.Order_Status = Order_Status || tempOrder.Order_Status;
//     tempOrder.Payment_Type = Payment_Type || tempOrder.Payment_Type;
//     tempOrder.Payment_Status = Payment_Status || tempOrder.Payment_Status;
//     tempOrder.Modified_At = Date.now();
  
//     // Update product
//     const updateCheck = await tempOrder.save(pointTransaction);
//     if (!updateCheck) {
//       await session.abortTransaction();
//       session.endSession();
  
//       const err = new Error("An error occurred while updating the order");
//       return next(err);
//     }
  
//     await session.commitTransaction();
//     session.endSession();
    
//     res.json({
//         success: true,
//         Order: tempOrder
//     })
//   })

exports.getAccountList = catchAsyncErrors(async (req, res, next) => {
    const page = req.query.page;
    const total = await account.find({isDelete: false}).countDocuments();
    const Account = await pagination(
        account.find({isDelete: false}),
        page,
        10
    )
    
    res.status(201).json({
        success: true,
        total: total,
        totalCurrentPage: Account.length,
        Account
    })
})

exports.getAccountProfile = catchAsyncErrors(async (req, res, next) => {
    const tempAccount = req.Account;
    const Account = await account.findById(tempAccount);
    
    res.status(201).json({
        success: true,
        Account
    })
})

exports.loginAccount = catchAsyncErrors(async (req, res, next) => {
    const { Email, Password } = req.body;
    //console.log('Email: ', req.body.Email);

    //checks if email and password is entered by account
    if (!Email || !Password) {
        const err = new Error('Please enter email & password');
        return next(err);
    }

    const Account = await account.findOne({ Email: Email }).select('+Password');
    //console.log('Account: ', Account);

    if(!Account) {
        const err = new Error('Invalid email or password');
        return next(err);
    }

    //Check if password is correct or not
    const isPasswordMethod = await Account.comparePassword(Password);

    if (!isPasswordMethod) {
        const err = new Error('Invalid email or password');
        return next(err);
    }

    sendToken(Account, res);
})

exports.logoutAccount = catchAsyncErrors(async (req, res, next) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    })

    res.json({
        success: true,
        message: 'Logged out'
    })
})

exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
    const { Email } = req.body;

    const Account = await account.findOne({ Email: Email });

    if (!Account) {
        const err = new Error('Account not found with email');
        return next(err);
    }

    //Get reset token
    const resetToken = Account.getResetPasswordToken();

    await Account.save({ validateBeforeSave: false });

    // Create reset password url
    const resetUrl = req.protocol + '://' + req.get('host') + '/accounts/resetPassword?token=' + resetToken;

    const message = 'Your password reset token is an follow:\n\n' + resetUrl + '\n\nIf you have not requested this email, then ignore it.';

    try {
        await sendEmail({
            email: Account.Email,
            subject: 'ShopCake Password Recovery',
            message
        })

        res.json({
            success: true,
            message: 'Email sent to ' + Account.Email
        })
    }
    catch (error){
        Account.resetPasswordToken = undefined;
        Account.resetPasswordExpire = undefined;

        await Account.save({ validateBeforeSave: false });

        const err = new Error(error);
        return next(err);
    }
})

exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
    const token = req.query.token
    const { password, confirmPassword } = req.body;

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const Account = await account.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    })

    if (!Account) {
        const err = new Error('Password reset token is invalid or has been expired');
        return next(err);
    }

    if (password != confirmPassword) {
        const err = new Error('Password does not match');
        return next(err);
    }

    Account.Password = password;
    Account.resetPasswordToken = undefined;
    Account.resetPasswordExpire = undefined;

    await Account.save();

    sendToken(Account, res);
})

exports.filterAccount = catchAsyncErrors(async (req, res, next) => {
    const nameRole = req.query.Role;
    const page = req.query.page;

    // find Account id
    const tempAccount = await account.findOne({ Role: nameRole });

    const nameSort = req.query.Sort || '';

    // Set field and sort name
    let field = 0;
    let sort = 0;
    tempSort = ['fullnameasc', 'fullnamedesc', 'addressasc', 'addressdesc']
    if(tempSort.includes(nameSort.toLowerCase())) {
        field = 'FullName';
        sort = nameSort.slice(8, nameSort.length);
        if (nameSort.slice(0, 7).toLowerCase() == 'address') {
            field = 'Address';
            sort = nameSort.slice(7, nameSort.length);
        }
    }

    let Account;
    let total;

    if (!tempAccount) {
        total = await account.find({ isDelete: false }).sort([[ field, sort ]]).countDocuments();
        Account = await pagination(
            account.find({ isDelete: false }).sort([[ field, sort ]]),
            page,
            10
        )
    }
    else {
        total = await account.find({ Role: nameRole, isDelete: false }).sort([[ field, sort ]]).countDocuments();
        Account = await pagination(
            account.find({ Role: nameRole, isDelete: false }).sort([[ field, sort ]]),
            page,
            10
        )
    }
    
    res.status(201).json({
        success: true,
        total: total,
        totalCurrentPage: Account.length,
        Account
    })
})

exports.deleteAccount = catchAsyncErrors(async (req, res, next) => {
    const accountId = req.query.accountId;
    const ObjectId = mongoose.Types.ObjectId;
    if (!accountId || !ObjectId.isValid(accountId)) {
        const err = new Error('Id id not valid');
        return next(err);
    }

    let tempAccount = await account.findById(accountId);
    if (!tempAccount || tempAccount.isDelete == true) {
        const err = new Error('Account not found');
        return next(err);
    }

    tempAccount.isDelete = true;
    
    const newAccount = await account.findByIdAndUpdate(accountId, tempAccount, {
        new: true,
        runValidators: true,
        useFindAndModified: false
    });

    res.status(201).json({
        success: true,
        message: 'Account deleted'
    })
})

exports.enableAccount = catchAsyncErrors(async (req, res, next) => {
    const accountId = req.query.accountId;
    const ObjectId = mongoose.Types.ObjectId;
    if (!accountId || !ObjectId.isValid(accountId)) {
        const err = new Error('Id id not valid');
        return next(err);
    }

    let tempAccount = await account.findById(accountId);
    if (!tempAccount || tempAccount.isDelete == false) {
        const err = new Error('Account not found');
        return next(err);
    }

    tempAccount.isDelete = false;
    
    const newAccount = await account.findByIdAndUpdate(accountId, tempAccount, {
        new: true,
        runValidators: true,
        useFindAndModified: false
    });

    res.status(201).json({
        success: true,
        message: 'Account enabled'
    })
})

exports.getAccountDisableList = catchAsyncErrors(async (req, res, next) => {
    const page = req.query.page;
    const total = await account.find({isDelete: true}).countDocuments();
    const Account = await pagination(
        account.find({isDelete: true}),
        page,
        10
    )
    
    res.status(201).json({
        success: true,
        total: total,
        totalCurrentPage: Account.length,
        Account
    })
})

exports.addAddress = catchAsyncErrors(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const pointTransaction = { session };
  
    //get data
    const tempAccount = req.Account;
    const { accountAddress } = req.query;
  
    // INIT values
    let createCheck;
    let updateCheck;
    let deleteCheck;
  
    // UPDATE 
    tempAccount.Address = accountAddress;
    updateCheck = tempAccount.save(pointTransaction);
    if (!updateCheck) {
        await session.abortTransaction();
        session.endSession();
    
        const err = new Error("An error occurred during add account address");
        return next(err);
    }

    res.json({
      success: true,
      message: "Add account address success"
    })
  
    await session.commitTransaction();
    session.endSession();
})