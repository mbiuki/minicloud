'use strict';
console.log('Loading function');
let doc = require('dynamodb-doc');
let dynamo = new doc.DynamoDB();
let sensorTable = "SensorTable";

exports.handler = (event, context, callback) => {
	console.log('Received event:', JSON.stringify(event, null, 2));

	if (!event.sensorId) {
		if (!event.pathParameters.proxy) {
			callback(null, {
				statusCode: 200,
				body: JSON.stringify({})
			});
		}
		event.sensorId = event.pathParameters.proxy;
	}

	// Default time range if not provided (last 5 mins)
	let timeend = new Date().getTime();
	let timestart = timeend - (300 * 1000);

	// Use timeStart and timeEnd if provided directly (test)
	if (event.timestart) {
		timestart = event.timestart;
	}
	if (event.timeend && event.timeend > timestart) {
		timeend = event.timeend;
	}

	// Use timeStart and timeEnd if provided in GET query
	if (event.queryStringParameters) {
		if (event.queryStringParameters.timestart) {
			timestart = event.queryStringParameters.timestart;
		}
		if (event.queryStringParameters.timeend && event.queryStringParameters.timeend > timestart) {
			timeend = event.queryStringParameters.timeend;
		}
	}

	let params = {
		TableName: sensorTable,
		KeyConditionExpression: 'sensorId = :hkey and payloadTimestamp between :timestart and :timeend',
		ExpressionAttributeValues: {
			':hkey': event.sensorId,
			':timestart': timestart.toString(),
			':timeend': timeend.toString()
		},
	};

	dynamo.query(params, function(err, data) {
		if (err) {
			console.log(err, err.stack);
			callback(null, {
				statusCode: 200,
				body: JSON.stringify({})
			});
		} else {
			console.log(data);
			callback(null, {
				statusCode: 200,
				body: JSON.stringify(data)
			});
		}
	});
};