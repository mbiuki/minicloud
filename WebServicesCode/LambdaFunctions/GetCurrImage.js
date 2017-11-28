'use strict';
console.log('Loading function');
let doc = require('dynamodb-doc');
let dynamo = new doc.DynamoDB();
let sensorCurrTable = "CurrImageTable";

function returnResult(callback, statusCode, body) {
	callback(null, {
		statusCode: statusCode,
		headers: { 
            "Access-Control-Allow-Origin": "*" 
        },
		body: JSON.stringify(body)
	});
}

exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    let params = {
        TableName: sensorCurrTable,
    };
    
    dynamo.scan(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            returnResult(callback, 400, err);
        }
        else  {   
            console.log(data);           // successful response
            returnResult(callback, 200, data);
        }
    });
};
