const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

const dotenv = require('dotenv');
dotenv.config({ path: './config/.env', encoding: 'utf8', debug: false});

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "ShopCake/Product",
  },
});

const upload = multer({ storage: storage });

exports.uploadImage = upload.single("Image");

