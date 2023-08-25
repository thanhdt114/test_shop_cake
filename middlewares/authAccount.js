const jwt = require("jsonwebtoken");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const account = require("../models/account");

exports.isAuthenticatedAccount = catchAsyncErrors(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Set token from cookie
  else if (req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) {
    const err = new Error("Login first to access this resource");
    return next(err);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const tempAccount = await account.findById(decoded.id);
  if (tempAccount.isDelete == true) {
    const err = new Error("Login first to access this resource");
    return next(err);
  }
  req.Account = await account.findById(decoded.id);

  next();
});

exports.authorizeRoles = (...role) => {
  return (req, res, next) => {
    if (!role.includes(req.Account.Role)) {
      const err = new Error(
        "Roles (" +
          req.Account.Role +
          ") is not allowed to access this resource"
      );
      return next(err);
    }

    next();
  };
};
