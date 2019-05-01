'use strict';
console.log('Loading function');
let doc = require('dynamodb-doc');
let dynamo = new doc.DynamoDB();
let sensorTable = "DroneSensorTable";
const acceptedSensors = ["barometer","gps"];

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

	if (event.pathParameters && event.pathParameters.proxy) {
		event.sensorId = event.pathParameters.proxy;
	}

	if (!event.sensorId) {
		returnResult(callback, 400, "Missing Sensor ID in Path");
		return;
	}

	if (acceptedSensors.indexOf(event.sensorId) < 0) {
		returnResult(callback, 400, "Not an accepted sensor to get status");
		return;
	}

	// Default time range if not provided (last 60 mins)
	let timeend = new Date().getTime();
	let timestart = timeend - (60 * 60 * 1000);

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
			returnResult(callback, 400, err);
		} else {
			console.log(data);
			returnResult(callback, 200, data);
		}
	});
};