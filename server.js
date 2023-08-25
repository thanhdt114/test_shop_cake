const express = require("express");
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const dotenv = require("dotenv");
const routes = require("./routes");
const { connectDatabase } = require("./config/connectDB");
const cors = require("cors");
const cookiesParser = require("cookie-parser");

dotenv.config({
  path: __dirname + "/config/.env",
  encoding: "utf8",
  debug: false,
});

const PORT = process.env.PORT;
connectDatabase();

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ShopCake APIs",
      version: "1.0.0",
      description: "Manage API ShopCake",
    },
    servers: [
      {
        url: "http://localhost:" + PORT,
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const specs = swaggerJsDoc(options);

const app = express();

// Enable CORS
app.use(
  cors({
    origin: true, //included origin as true
    credentials: true, //included credentials as true
  })
);

app.use(
  "/swagger",
  swaggerUI.serve,
  swaggerUI.setup(specs, { explorer: true })
);

app.use(express.json());
app.use(cookiesParser());

routes(app);

let url = "http://localhost:" + PORT + "/swagger";

app.listen(PORT, () => console.log(`The server is running on: ` + url));
