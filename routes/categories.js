const express = require("express");
const router = express.Router();
const {
    getCategoryList,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');

const multer = require("multer");

const upload = multer()


/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - title
 *         - author
 *       properties:
 *         Id:
 *           type: string
 *           description: The auto-generated id of the Category
 *         Name:
 *           type: string
 *           description: The Category name
 *         Description:
 *           type: string
 *           description: The Category description
 *         Created_At:
 *           type: date
 *           description: The Category price
 *         Modified_At:
 *           type: date
 *           description: The Category price
 *         isDelete:
 *           type: bool
 *           description: The Category price
 *       example:
 *         Name: string
 *         Description: string
 */

 /**
  * @swagger
  * tags:
  *   name: Categories
  *   description: The Categories managing API
  */

 /**
 * @swagger
 * /categories/getCategoryList:
 *   get:
 *     summary: Returns the list of all the Categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: The list of the categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */

router.get("/getCategoryList", getCategoryList);

 /**
 * @swagger
 * /categories/getCategoryById:
 *   get:
 *     summary: Returns category
 *     tags: [Categories]
 *     parameters:
 *     - in: query
 *       name: Id
 *       description: Id
 *       schema:
 *         type: string
 *     responses:
 *       200:
 *         description: Get single category
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
 router.get("/getCategoryById", getCategoryById);

/**
 * @swagger
 * /categories/createCategory:
 *   post:
 *     summary: Returns Category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       200:
 *         description: Create new Category
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
 router.post("/createCategory", upload.none(), createCategory);

/**
 * @swagger
 * /categories/updateCategory:
 *   post:
 *     summary: Returns Category
 *     tags: [Categories]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idCategory:
 *                 type: string   
 *               Name:
 *                 type: string 
 *               Description:
 *                 type: string 
 *     responses:
 *       200:
 *         description: Update new Category
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */
router.post("/updateCategory", upload.none(), updateCategory);

 /**
 * @swagger
 * /categories/deleteCategory:
 *   delete:
 *     summary: Returns message
 *     tags: [Categories]
 *     parameters:
 *     - in: query
 *       name: categoryId
 *       description: Id category
 *       schema:
 *         type: string
 *     responses:
 *       200:
 *         description: return message
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 */

  router.delete("/deleteCategory", deleteCategory);

module.exports = router;
