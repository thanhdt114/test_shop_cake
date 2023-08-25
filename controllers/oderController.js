// const paypal = require('paypal-rest-sdk');

// paypal.configure({
//     'mode': 'sandbox', //sandbox or live
//     'client_id': process.env.PAYPAL_CLIENT_ID,
//     'client_secret': process.env.PAYPAL_CLIENT_SECRET
// });

// exports.paypalSandbox = paypal;
/////////////////////////////////////////////////////////////////////////////////

const mongoose = require("mongoose");
//const { startSession } = require('mongoose')

const catchAsyncErrors = require("../utils/catchAsyncErrors");
const pagination = require("../utils/pagination");
const logOrderDetail = require("../models/logOrderDetail");
const account = require("../models/account");
const order = require("../models/order");
const product = require("../models/product");
const orderDetail = require("../models/orderDetail");
const paypal = require("../utils/paypalSandbox")

exports.getProductInCart = catchAsyncErrors(async (req, res, next) => {
  //get data
  const tempAccount = req.Account;

  let updateCheck;

  // UPDATE price and quantity in cart
  let tempProduct;
  const lenCart = tempAccount.Cart.length || 0;
  for (var i = 0; i < lenCart; i++) {
    tempProduct = await product.findOne({ _id: tempAccount.Cart[i].productId });
    tempAccount.Cart[i].Price = tempProduct.Price;
    tempAccount.Cart[i].quantityInStock = tempProduct.Quantity;
    tempAccount.Cart[i].isDelete = tempProduct.isDelete;
  }

  updateCheck = await tempAccount.save();

  res.status(201).json({
    success: true,
    total: lenCart,
    Cart: tempAccount.Cart,
  });
});

exports.addToCart = catchAsyncErrors(async (req, res, next) => {
  //get data
  const tempAccount = req.Account;
  const { Product, Quantity, Product_Sweet } = req.body;

  let updateCheck = 0;

  //validate product id
  const ObjectId = mongoose.Types.ObjectId;
  if (!Product || !ObjectId.isValid(Product)) {
    const err = new Error("Product id not valid");
    return next(err);
  }

  //check product in stock
  const tempProduct = await product.findById(Product);
  if (!tempProduct || tempProduct.isDelete == true) {
    const err = new Error("Product not found");
    return next(err);
  }

  //CHECK product quantity
  if (tempProduct.Quantity < Quantity) {
    const err = new Error("The number of products in stock is not enough");
    return next(err);
  }

  const lenCart = tempAccount.Cart.length || 0;
  let updateQuantity = 0;
  let newItemCart;
  // UPDATE product quantity in cart
  for(var i = 0; i < lenCart; i ++) {
    if( 1 == 1
      && tempAccount.Cart[i].productId == Product
      && tempAccount.Cart[i].productSweet == Product_Sweet) {
      tempAccount.Cart[i].productQuantity += Quantity;
      updateQuantity++;
      updateCheck = await tempAccount.save();
      break;
    }
  }

  if(updateCheck == 0) {
    // CREATE product in cart
    if(updateQuantity == 0) {
      newItemCart = {
        productId: tempProduct._id,
        productName: tempProduct.Name,
        productImage: tempProduct.Image.Url,
        productPrice: tempProduct.Price,
        productQuantity: Quantity,
        productSweet: Product_Sweet,
        quantityInStock: tempProduct.Quantity
      }
      tempAccount.Cart.push(newItemCart);
    }
    updateCheck = await tempAccount.save();
  }

  res.status(201).json({
    success: true,
    Cart: tempAccount.Cart,
  });
});

exports.getOrderList = catchAsyncErrors(async (req, res, next) => {
  const orderStatus = ["order", "delivering", "done"];
  const Order = await order.find({ Order_Status: orderStatus, isDelete: false });
  const total = Order.length;

  res.status(201).json({
    success: true,
    total: total,
    Order,
  });
});

exports.getOrderByAccount = catchAsyncErrors(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const pointTransaction = { session };

  //get data
  const tempAccount = req.Account;

  // INIT values
  let createCheck;
  let updateCheck;
  let deleteCheck;

  // GET order by account with status != await
  const orderStatus = ["order", "delivering", "done"];
  const tempOrder = await order.find({ 
    Account: tempAccount._id, 
    Order_Status: orderStatus, 
    isDelete: false 
  })
  const total = tempOrder.length || 0;

  res.json({
    success: true,
    total: total,
    Order: tempOrder
  })

  await session.commitTransaction();
  session.endSession();
});

exports.getOrderById = catchAsyncErrors(async (req, res, next) => {
  // GET data
  const Id = req.query.Id;
  const ObjectId = mongoose.Types.ObjectId;
  if (!Id || !ObjectId.isValid(Id)) {
    const err = new Error("Id id not valid");
    return next(err);
  }

  const Order = await order.findById(Id);
  if (!Order || Order.isDelete == true) {
    const err = new Error("Order not found");
    return next(err);
  }

  const total = Order.products.length || 0;

  res.status(201).json({
    success: true,
    total: total,
    Order
  });
});

exports.removeItemCart = catchAsyncErrors(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const pointTransaction = { session };

  //get data
  const itemCartId = req.query.itemCartId
  const tempAccount = req.Account;

  // INIT values
  let createCheck;
  let updateCheck;
  let deleteCheck;

  // const item = await logOrderDetail.findById(itemCartId)
  // if (!item) {
  //   await session.abortTransaction();
  //   session.endSession();

  //   const err = new Error("Item in card not found");
  //   return next(err);
  // }
  // // item.isDelete = true;
  // // item.save(pointTransaction)
  // await logOrderDetail.deleteOne({ _id: itemCartId })
  tempAccount.Cart.id(itemCartId).remove();
  updateCheck = await tempAccount.save(pointTransaction);
  if (!updateCheck) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("An error occurred during remove item cart");
    return next(err);
  }

  await session.commitTransaction();
  session.endSession();

  res.status(201).json({
    success: true
  });
});

exports.totalSales = catchAsyncErrors(async (req, res, next) => {
  const totalSales = await Order.aggregate([
    {
      $match: {
        isDelete: 0,
      },
    },
    {
      $group: {
        _id: null,
        totalSales: {
          $sum: Amount,
        },
      },
    },
  ]);

  if (!totalSales) {
    const err = new Error("The order sales cannot be generated");
    return next(err);
  }

  res.status(201).json({
    success: true,
    totalSales: totalSales,
  });
});

exports.updateOrder = catchAsyncErrors(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const pointTransaction = { session };

  // Validate Id
  const { idOrder, Amount, Order_FullName, Order_Address, 
            Order_Phone, Order_Status, Payment_Type, Payment_Status } = req.body;
  const ObjectId = mongoose.Types.ObjectId;
  if (!idOrder || !ObjectId.isValid(idOrder)) {
      const err = new Error('Id id not valid');
      return next(err);
  }

  // Check product exists in database
  const tempOrder = await order.findById(idOrder);
  if (!tempOrder || tempOrder.isDelete == true) {
      const err = new Error('Product not found');
      return next(err);
  }

  // SET values in order
  tempOrder.Amount = Amount || tempOrder.Amount;
  tempOrder.Order_FullName = Order_FullName || tempOrder.Order_FullName;
  tempOrder.Order_Address = Order_Address || tempOrder.Order_Address;
  tempOrder.Order_Phone = Order_Phone || tempOrder.Order_Phone;
  tempOrder.Order_Status = Order_Status || tempOrder.Order_Status;
  tempOrder.Payment_Type = Payment_Type || tempOrder.Payment_Type;
  tempOrder.Payment_Status = Payment_Status || tempOrder.Payment_Status;
  tempOrder.Modified_At = Date.now();

  // Update product
  const updateCheck = await tempOrder.save(pointTransaction);
  if (!updateCheck) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("An error occurred while updating the order");
    return next(err);
  }

  await session.commitTransaction();
  session.endSession();
  
  res.json({
      success: true,
      Order: tempOrder
  })
})

exports.paymentOrderByCash = catchAsyncErrors(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const pointTransaction = { session };

  //get data
  const tempAccount = req.Account;
  const { orderEmail, orderFullName, orderAddress, orderPhone, productList } = req.body;

  // INIT value
  let updateCheck;
  let createCheck;

  if(!orderEmail || !orderFullName || !orderAddress || !orderPhone) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("Data input is not invalid");
    return next(err);
  }

  // CHECK order
  const tempOrder = await order.findOne({ Account: tempAccount._id, Order_Status: "await", isDelete: false});
  if (!tempOrder) {
    let newOrder = new order();
    newOrder.Account = tempAccount._id;
    await order.create(newOrder);
  }
  else {
    tempOrder.products = [];
  }

  // DELETE product in order
  
  // PROCESS
  let tempOrderDetail = new orderDetail();
  let tempProduct = new product();
  let amount = 0;
  const len = productList.length;
  let lenCart = 0;
  let indexCart = -1;
  for (var i = 0; i < len; i ++) {
    // CHECK product in stock
    tempProduct = await product.findOne({ _id: productList[i].productId, isDelete: false });
    if(!tempProduct) {
      await session.abortTransaction();
      session.endSession();

      const err = new Error("Product not found in stock");
      return next(err);
    }

    // CHECK product in cart
    lenCart = tempAccount.Cart.length || 0;
    indexCart = -1;
    for (var j = 0; j < lenCart; j++) {
      if (1 == 1
        && tempAccount.Cart[j].productId == productList[i].productId
        && tempAccount.Cart[j].productQuantity == productList[i].productQuantity
        && tempAccount.Cart[j].productSweet == productList[i].productSweet
      ) {
        // DELETE product in cart
        tempAccount.Cart[j].remove();
        updateCheck = await tempAccount.save(pointTransaction)
        if (!updateCheck) {
          await session.abortTransaction();
          session.endSession();
    
          const err = new Error("An error occurred during delete product in cart");
          return next(err);
        } 
        indexCart = j;
        break;
      }
    }
    if (indexCart == -1) {
      await session.abortTransaction();
      session.endSession();

      const err = new Error("Product not found in cart");
      return next(err);
    } 

    // CHECK product quantity
    if (tempProduct.Quantity < productList[i].productQuantity) {
      await session.abortTransaction();
      session.endSession();

      const err = new Error("Not enough product quantity");
      return next(err);
    }

    //UPDATE product quantity in stock
    tempProduct.Quantity -= productList[i].productQuantity;
    if (tempProduct.Quantity > 0) {
      tempProduct.quantityStatus = true;
    }
    else {
      tempProduct.quantityStatus = false;
    }
    updateCheck = await tempProduct.save(pointTransaction);
    if(!updateCheck) {
      await session.abortTransaction();
      session.endSession();
  
      const err = new Error("An error occurred during order payment");
      return next(err);
    }

    // CREATE product in order
    tempOrderDetail = {
      _id: tempProduct._id,
      Name: tempProduct.Name,
      Image: tempProduct.Image.Url,
      Price: tempProduct.Price,
      Quantity: productList[i].productQuantity,
      Sweet: productList[i].productSweet
    }
    tempOrder.products.push(tempOrderDetail);

    amount += tempProduct.Price * productList[i].productQuantity;
  }

  // UPDATE order
  tempOrder.Order_Status = "order";
  tempOrder.Order_Email = orderEmail;
  tempOrder.Order_FullName = orderFullName;
  tempOrder.Order_Address = orderAddress;
  tempOrder.Order_Phone = orderPhone;
  tempOrder.Order_Date = Date.now();
  tempOrder.Amount = amount;
  updateCheck = await tempOrder.save(pointTransaction);
  if(!updateCheck) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("An error occurred during order payment");
    return next(err);
  }

  // CREATE new order with orderStatus = await
  let newOrder = new order();
  newOrder.Account = tempAccount._id;
  createCheck = await order.create([newOrder], pointTransaction);
  if(!createCheck) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("An error occurred during order payment");
    return next(err);
  }

  await session.commitTransaction();
  session.endSession();

  const total = tempOrder.products.length || 0;

  res.json({
    success: true,
    Order: tempOrder,
    total: total,
  });
});

exports.paymentOrderByOnline = catchAsyncErrors(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const pointTransaction = { session };

  //get data
  const tempAccount = req.Account;
  const { redirectSuccess, redirectFail, orderEmail } = req.body;
  let { orderFullName, orderAddress, orderPhone, productList } = req.body;

  if(!orderEmail || !orderFullName || !orderAddress || !orderPhone) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("Data input is not invalid");
    return next(err);
  }

  if (productList.length == 0) {
    await session.abortTransaction();
    session.endSession();
    
    const err = new Error("Product list empty");
    return next(err);
  }

  // INIT value
  let updateCheck;
  let createCheck;

  // CHECK order
  const tempOrder = await order.findOne({ Account: tempAccount._id, Order_Status: "await", isDelete: false});
  if (!tempOrder) {
    let newOrder = new order();
    newOrder.Account = tempAccount._id;
    await order.create(newOrder);
  }
  else {
    // DELETE product in order
    tempOrder.products = [];
  }



  // PROCESS
  let tempOrderDetail = new orderDetail();
  let tempProduct = new product();
  let amount = 0;
  const len = productList.length;
  let lenCart = 0;
  let indexCart = -1;
  for (var i = 0; i < len; i ++) {
    // CHECK product in stock
    tempProduct = await product.findOne({ _id: productList[i].productId, isDelete: false });
    if(!tempProduct) {
      await session.abortTransaction();
      session.endSession();

      const err = new Error("Product not found in stock");
      return next(err);
    }

    // CHECK product quantity
    if (tempProduct.Quantity < productList[i].productQuantity) {
      await session.abortTransaction();
      session.endSession();

      const err = new Error("Not enough product quantity");
      return next(err);
    }

    // CHECK product in cart
    lenCart = tempAccount.Cart.length || 0;
    indexCart = -1;
    for (var j = 0; j < lenCart; j++) {
      if (1 == 1
        && tempAccount.Cart[j].productId == productList[i].productId
        && tempAccount.Cart[j].productQuantity == productList[i].productQuantity
        && tempAccount.Cart[j].productSweet == productList[i].productSweet
      ) {
        // // DELETE product in cart
        // tempAccount.Cart[j].remove();
        // updateCheck = await tempAccount.save(pointTransaction)
        // if (!updateCheck) {
        //   await session.abortTransaction();
        //   session.endSession();
    
        //   const err = new Error("An error occurred during delete product in cart");
        //   return next(err);
        // } 
        indexCart = j;
        break;
      }
    }
    if (indexCart == -1) {
      await session.abortTransaction();
      session.endSession();

      const err = new Error("Product not found in cart");
      return next(err);
    }

    // CREATE product in order
    tempOrderDetail = {
      _id: tempProduct._id,
      Name: tempProduct.Name,
      Image: tempProduct.Image.Url,
      Price: tempProduct.Price,
      Quantity: productList[i].productQuantity,
      Sweet: productList[i].productSweet
    }
    tempOrder.products.push(tempOrderDetail);

    amount += tempProduct.Price * productList[i].productQuantity;
  }

  // UPDATE order
  tempOrder.Order_Email = orderEmail;
  tempOrder.Order_FullName = orderFullName;
  tempOrder.Order_Address = orderAddress;
  tempOrder.Order_Phone = orderPhone;
  tempOrder.Amount = amount;
  tempOrder.Payment_Type = "online";
  updateCheck = await tempOrder.save(pointTransaction);
  if(!updateCheck) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("An error occurred during order payment");
    return next(err);
  }

  await session.commitTransaction();
  session.endSession();

  //GET product in order detail
  let itemInOrderDetail = [];
  let item = {};
  let totalPrice = 0.00;
  let lenOrder = tempOrder.products.length || 0;
  for (var i = 0; i < lenOrder; i++) {
    tempProduct = await product.findOne({ _id: tempOrder.products[i]._id, isDelete: false });
    if (!tempProduct) {
      const err = new Error("Product not found in stock");
      return next(err);
    }

    item = {
      name: tempProduct.Name,
      sku: i,
      price: tempOrder.products[i].Price,
      currency: "USD",
      quantity: tempOrder.products[i].Quantity
    }
    itemInOrderDetail.push(item)
    totalPrice += (item.quantity * item.price);
  }

  // DETECT input
  const replace = '0';
  if (orderFullName == 'string' || orderFullName == 'null' || orderFullName == 'empty') {
    orderFullName = replace;
  }
  if (orderAddress == 'string' || orderAddress == 'null' || orderAddress == 'empty') {
    orderAddress = replace;
  }
  if (orderPhone == 'string' || orderPhone == 'null' || orderPhone == 'empty') {
    orderPhone = replace;
  }
 
  const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal",
            "payer_info": {
              "country_code": "VN"
            }
        },
        "redirect_urls": {
            "return_url": "http://localhost:5000/orders/paymentSuccess",
            "cancel_url": redirectFail
        },
        "transactions": [{
            "item_list": {
                "items": itemInOrderDetail,
                "shipping_address": {
                  "recipient_name": orderFullName,
                  "line1":orderAddress,
                  "city": "a",
                  "state":"b",
                  "postal_code":"10000",
                  "country_code":"VN",
                  "phone": orderPhone
                }
            },
            "amount": {
                "currency": "USD",
                "total": totalPrice
            },
            "description": "Shop cake",
        }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
          const err = new Error("An error occurred during the checkout process");
          return next(err);
        } else {
            for (let i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel === 'approval_url') {
                    //res.redirect(payment.links[i].href);
                    res.json({
                      success: true,
                      redirect: payment.links[i].href,
                    })
                }
            }
        }
    });
    
});

exports.paymentSuccess = catchAsyncErrors(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const pointTransaction = { session };

  //get data
  const tempAccount = req.Account;
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  // INIT values
  let createCheck;
  let updateCheck;
  let deleteCheck;

  // CHECK order with account
  const tempOrder = await order.findOne({ 
    Account: tempAccount._id, 
    Order_Status: "await", 
    isDelete: false 
  })
  if (!tempOrder) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("An error occurred during the checkout process");
    return next(err);
  }

  // DELETE product in cart and cal totalPrice
  let totalPrice = 0.00;
  let tempProduct = new product();
  let lenOrder = tempOrder.products.length || 0;
  let lenCart = tempAccount.Cart.length || 0;
  let indexCart = -1;
  for (var i = 0; i < lenOrder; i++) {
    // CHECK product in stock
    tempProduct = await product.findOne({ _id: tempOrder.products[i]._id, isDelete: false });
    if(!tempProduct) {
      await session.abortTransaction();
      session.endSession();
  
      const err = new Error("An error occurred during delete product in cart");
      return next(err);
    }

    // CHECK product in cart
    lenCart = tempAccount.Cart.length || 0;
    indexCart = -1;
    for (var j = 0; j < lenCart; j++) {
      if (1 == 1
        && tempAccount.Cart[j].productId == tempOrder.products[i]._id
        && tempAccount.Cart[j].productQuantity == tempOrder.products[i].Quantity
        && tempAccount.Cart[j].productSweet == tempOrder.products[i].Sweet
      ) {
        // DELETE product in cart
        tempAccount.Cart[j].remove();
        updateCheck = await tempAccount.save(pointTransaction)
        if (!updateCheck) {
          await session.abortTransaction();
          session.endSession();
    
          const err = new Error("An error occurred during delete product in cart");
          return next(err);
        } 
        indexCart = j;
        break;
      }
    }
    if (indexCart == -1) {
      await session.abortTransaction();
      session.endSession();

      const err = new Error("Product not found in cart");
      return next(err);
    } 
    
    // CHECK product quantity
    if (tempProduct.Quantity < tempOrder.products[i].Quantity) {
      await session.abortTransaction();
      session.endSession();
  
      const err = new Error("Not enough product quantity");
      return next(err);
    }

    // UPDATE product quantity
    tempProduct.Quantity -= tempOrder.products[i].Quantity;
    if (tempProduct.Quantity > 0) {
      tempProduct.quantityStatus = true;
    }
    else {
      tempProduct.quantityStatus = false;
    }
    updateCheck = await tempProduct.save(pointTransaction);
    if(!updateCheck) {
      await session.abortTransaction();
      session.endSession();
  
      const err = new Error("An error occurred during update product quantity");
      return next(err);
    }

    totalPrice += (tempOrder.products[i].Quantity * tempOrder.products[i].Price)
  }

  const execute_payment_json = {
      "payer_id": payerId,
      "transactions": [{
          "amount": {
              "currency": "USD",
              "total": totalPrice
          }
      }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, async function(error, payment) {
    if (error) {
      await session.abortTransaction();
      session.endSession();
  
      const err = new Error("An error occurred during the checkout process");
      return next(err);
    } 
  });

  // UPDATE order
  tempOrder.Amount = totalPrice;
  tempOrder.Order_Status = "order";
  tempOrder.Order_Date = Date.now();
  tempOrder.Payment_Status = "paid";
  updateCheck = tempOrder.save(pointTransaction);
  if (!updateCheck) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("An error occurred during update order status");
    return next(err);
  }

  // CREATE new order with orderStatus = await
  let newOrder = new order();
  newOrder.Account = tempAccount._id;
  createCheck = await order.create([newOrder], pointTransaction);
  if(!createCheck) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("An error occurred during order payment");
    return next(err);
  }

  // await session.commitTransaction();
  // session.endSession();

  res.json({
    success: true,
    message: "Payment success"
  })

  await session.commitTransaction();
  session.endSession();
});

exports.cancelOrder = catchAsyncErrors(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const pointTransaction = { session };

  //get data
  const { orderId }  = req.query
  const tempAccount = req.Account;

  // INIT values
  let createCheck;
  let updateCheck;
  let deleteCheck;

  // CHECK order exists
  const tempOrder = await order.findOne({ _id: orderId, isDelete: false })
  if (!tempOrder) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("Order not found");
    return next(err);
  }

  // CHECK order status
  if (tempOrder.Order_Status != 'order') {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("Cancel order only when status is order");
    return next(err);
  }

  // CHECK order payment type
  if (tempOrder.Payment_Type != 'cash') {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("Can't cancel online payment order");
    return next(err);
  }

  // UPDATE order status
  tempOrder.Order_Status = 'cancel'
  updateCheck = await tempOrder.save(pointTransaction);
  if (!updateCheck) {
    await session.abortTransaction();
    session.endSession();

    const err = new Error("An error occurred during cancel order");
    return next(err);
  }

  // UPDATE product quantity
  let tempProduct;
  const lenProducts = tempOrder.products.length
  for (var i = 0; i < lenProducts; i++) {
    // CHECK product exists
    tempProduct = await product.findOne({ _id: tempOrder.products[i]._id })
    if (!tempProduct) {
      await session.abortTransaction();
      session.endSession();
  
      const err = new Error("An error occurred during cancel order");
      return next(err);
    }

    tempProduct.Quantity += tempOrder.products[i].Quantity;
    if (tempProduct.Quantity > 0) {
      tempProduct.quantityStatus = true;
    }
    else {
      tempProduct.quantityStatus = false;
    }
    updateCheck = await tempProduct.save(pointTransaction);
    if (!updateCheck) {
      await session.abortTransaction();
      session.endSession();
  
      const err = new Error("An error occurred during cancel order");
      return next(err);
    }
  }

  await session.commitTransaction();
  session.endSession();

  res.status(201).json({
    success: true,
    message: 'Cancel order success'
  });
});