const AWS = require('aws-sdk');
const iotData = new AWS.IotData({ endpoint: process.env.AWS_IOT_ENDPOINT });

function returnResult(callback, statusCode, body) {
	callback(null, {
		statusCode: statusCode,
		headers: { 
            "Access-Control-Allow-Origin": "*",
        },
		body: JSON.stringify(body)
	});
}

exports.handler = (event, context, callback) => {
	if (event.body) {
	    let body = JSON.parse(event.body);
	    if (body.temp) {
		    event.temp = body.temp;
	    }
	    if (body.humidity) {
		    event.humidity = body.humidity;
	    }
	}

	if (event.temp === null || event.temp === undefined) {
		returnResult(callback, 400, "Missing Temperature in Body");
		return;
	}
	
	if (event.humidity === null || event.humidity === undefined) {
		returnResult(callback, 400, "Missing Humidity in Body");
		return;
	}

	let payload = {};
	let date = new Date();
	payload.timeStampEpoch = date.getTime();
	payload.timeStampIso = date.toISOString();
	payload.temp = event.temp;
	payload.humidity = event.humidity;

	const params = {
		topic: 'sensor/temp/payload',
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