// config dynamodb
const {DynamoDBClient} = require("@aws-sdk/client-dynamodb");
const client = new DynamoDBClient({
    // commit when deploy on aws
    // region: "localhost",
    // accessKeyId: "aws_key_id",
    // secretAccessKeyId: "aws_key_secret",
    // endpoint: "http://localhost:8000"
});

module.exports = client;