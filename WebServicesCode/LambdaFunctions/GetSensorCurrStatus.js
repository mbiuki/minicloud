'use strict';
console.log('Loading function');
let doc = require('dynamodb-doc');
let dynamo = new doc.DynamoDB();
let sensorCurrTable = "SensorCurrTable";

exports.handler = (event, context, callback) => {
	console.log('Received event:', JSON.stringify(event, null, 2));

	let params = {
		TableName: sensorCurrTable,
	};

	dynamo.scan(params, function(err, data) {
		if (err) {
			console.log(err, err.stack); // an error occurred
			callback(null, {
				statusCode: 400,
				body: {}
			});
		} else {
			console.log(data); // successful response
			callback(null, {
				statusCode: 200,
				body: JSON.stringify(data)
			});
		}
	});
};