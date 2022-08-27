const db = require("./dynamodb")
const {
  PutItemCommand,
  DeleteItemCommand,
  ScanCommand
} = require("@aws-sdk/client-dynamodb")
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const serverless = require('serverless-http');
const express = require('express')
const cors = require('cors');
const app = express()
app.use(cors());



// add to cart
app.post('/cart/add', async (req, res) => {
  try {
    const obj = JSON.parse(req.body)
    const params = {
      TableName: process.env.CART_TABLE_NAME, // table name from the serverless file
      Item: marshall(obj || {}) // conver it in dynamo formate
    }
    const data = await db.send(new PutItemCommand(params))
    if (data.$metadata.httpStatusCode === 200) {
      res.status(201).json({
        message: 'Successfully added product into cart.',
        success: true
      })
    }
    else {
      res.status(400).json({
        message: 'Something went wrong.',
        success: false
      })
    }
  } catch (e) {
    res.status(500).json({
      message: `Server error 500`,
      success: false,
      error: e.message,
      stack: e.stack
    });
  }
})

// get all products
app.get('/cart/products', async (req, res) => {
  try {
    const { Items } = await db.send(new ScanCommand({ TableName: process.env.CART_TABLE_NAME })); // send params to dynamo client to get data

    if(Items && Items.length > 0) {
      res.status(200).json({
        data: Items.map((item) => unmarshall(item)),
        message: 'Successfully fetched all cart products.',
        success: true
      });
    }else{
      res.status(200).json({
        data: [],
        message: 'Not found product.',
        success: false
      });
    }
  } catch (e) {
    res.status(500).json({
      message: `Server error 500`,
      success: false,
      error: e.message,
      stack: e.stack
    });
  }
})


// delete single product
app.delete('/cart/remove/:uuid', async (req, res) => {
  try {
    const params = {
      TableName: process.env.CART_TABLE_NAME,
      Key: marshall({ uuid: req.params.uuid }),
    };
    const data = await db.send(new DeleteItemCommand(params)); // send params to dynamo client to get data
    if (data.$metadata.httpStatusCode === 200) {
      res.status(200).json({
        message: 'Successfully removed products from cart.',
        success: true
      })
    }
    else {
      res.status(400).json({
        message: 'Something went wrong.',
        success: false
      })
    };
  } catch (e) {
    res.status(500).json({
      message: `Server error 500`,
      success: false,
      error: e.message,
      stack: e.stack
    });
  }
})


module.exports.handler = serverless(app);