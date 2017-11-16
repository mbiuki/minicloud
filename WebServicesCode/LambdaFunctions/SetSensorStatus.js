const AWS = require('aws-sdk');
const iotData = new AWS.IotData({ endpoint: process.env.AWS_IOT_ENDPOINT });
const acceptedSensors = ["led", "lock"];

function returnResult(callback, statusCode, body) {
	callback(null, {
		statusCode: statusCode,
		body: JSON.stringify(body)
	});
}

exports.handler = (event, context, callback) => {
	if (event.pathParameters && event.pathParameters.proxy) {
		event.sensorId = event.pathParameters.proxy;
	}

	if (!event.sensorId) {
		returnResult(callback, 400, "Missing Sensor ID in Path");
		return;
	}

	if (acceptedSensors.indexOf(event.sensorId) < 0) {
		returnResult(callback, 400, "Not an accepted sensor to modify status");
		return;
	}

	if (event.body) {
	    let body = JSON.parse(event.body);
	    if (body.status) {
		    event.status = body.status;
	    }
	}

	if (event.status === null || event.status === undefined) {
		returnResult(callback, 400, "Missing Status in Body");
		return;
	}
	
	if (event.status != '0' && event.status != '1') {
	    returnResult(callback, 400, "Status can only be 0 or 1");
		return;
	}

	let payload = {};
	let date = new Date();
	payload.timeStampEpoch = date.getTime();
	payload.timeStampIso = date.toISOString();
	payload.status = event.status;

	const params = {
		topic: 'sensor/' + event.sensorId + '/payload',
		payload: JSON.stringify(payload)
	};

	iotData.publish(params, (err, res) => {
		if (err) {
			returnResult(callback, 400, "IoT Publish Error");
		}

		console.log(res);
		returnResult(callback, 200, payload);
	});
};