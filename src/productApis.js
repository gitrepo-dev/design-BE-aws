const db = require("./dynamodb")
const {
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  ScanCommand,
  UpdateItemCommand
} = require("@aws-sdk/client-dynamodb")
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const serverless = require('serverless-http');
const express = require('express')
const cors = require('cors');
const app = express()
app.use(cors());

// add single product
app.post('/product/purchase', async (req, res) => {
  try {
    const obj = JSON.parse(req.body)

    if (!obj.billingDetails.card_number) {
      res.status(200).json({
        message: 'Please add billing details.',
        success: false
      });
    } else {
      let params;
      if (obj?.product?.length > 0) {
        obj.product.forEach(async (eachItem) => {

          params = {
            TableName: process.env.PRODUCT_TABLE_NAME, // table name from the serverless file
            Item: marshall(eachItem || {}) // conver it in dynamo formate
          }

          const { Item } = await db.send(new GetItemCommand({
            TableName: process.env.CART_TABLE_NAME,
            Key: marshall({ uuid: eachItem.uuid }),
          }))
          let response;
          if (Item && Item?.uuid?.S) {
            response = await db.send(new DeleteItemCommand({
              TableName: process.env.CART_TABLE_NAME,
              Key: marshall({ uuid: eachItem.uuid })
            }))
          }
          if (response?.$metadata?.httpStatusCode) {
            await db.send(new PutItemCommand(params))
          }
        })
        const { Items } = await db.send(new ScanCommand({ TableName: process.env.CART_TABLE_NAME }));
        if (Items) {
          res.status(200).json({
            message: 'Successfully purchased.',
            success: true
          });
        }
      } else {
        params = {
          TableName: process.env.PRODUCT_TABLE_NAME, // table name from the serverless file
          Item: marshall(obj.product || {}) // conver it in dynamo formate
        }
        await db.send(new PutItemCommand(params))
        res.status(200).json({
          message: 'Successfully purchased.',
          success: true
        });
      }
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
app.get('/purchased/history', async (req, res) => {
  try {
    const { Items } = await db.send(new ScanCommand({ TableName: process.env.PRODUCT_TABLE_NAME })); // send params to dynamo client to get data
    if (Items && Items.length > 0) {
      res.status(200).json({
        data: Items.map((item) => unmarshall(item)),
        message: 'Successfully fetched all purchased history.',
        success: true
      });
    } else {
      res.status(200).json({
        data: [],
        message: 'Not purchase history found.',
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


// udapte single product
app.put('/product/update/:productId', async (req, res) => {
  try {
    const body = JSON.parse(req.body);
    const objKeys = Object.keys(body);
    const params = {
      TableName: process.env.CART_TABLE_NAME,
      Key: marshall({ uuid: req.params.uuid }),
      UpdateExpression: `SET ${objKeys.map((_, index) => `#key${index} = :value${index}`).join(", ")}`,
      ExpressionAttributeNames: objKeys.reduce((acc, key, index) => ({
        ...acc,
        [`#key${index}`]: key,
      }), {}),
      ExpressionAttributeValues: marshall(objKeys.reduce((acc, key, index) => ({
        ...acc,
        [`:value${index}`]: body[key],
      }), {})),
    };
    const result = await db.send(new UpdateItemCommand(params));
    res.status(200).json({
      data: result ? [body] : [],
      message: 'Successfully udpated product.',
      success: true
    });
  } catch (e) {
    res.status(500).json({
      message: `Server error 500`,
      success: false,
      error: e.message,
      stack: e.stack
    });
  }
})


// delete all products
app.delete('/delete/history', (req, res) => {
  try {
    const obj = JSON.parse(req.body)
    if (obj && obj?.length > 0) {
      obj.forEach((eachItem) => {
        const params = {
          TableName: process.env.PRODUCT_TABLE_NAME, // table name from the serverless file
          Key: marshall({ uuid: eachItem.uuid }) // conver it in dynamo formate
        }
        db.send(new DeleteItemCommand(params))
      })
      res.status(200).json({
        message: 'Successfully deleted purchased history.',
        success: true
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

module.exports.handler = serverless(app);