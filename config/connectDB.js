const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/.env', encoding: 'utf8', debug: false});

const DATABASE_URL = process.env.DATABASE_URL;

exports.connectDatabase = () => {

  mongoose
    .connect(DATABASE_URL, {
      useNewUrlParser: true,
    })
    .then(() => console.log(`Database connected successfully!`))
    .catch((err) => {
      console.log(`error connecting database: ${err.message}`);
      process.exit(1);
    });
};
