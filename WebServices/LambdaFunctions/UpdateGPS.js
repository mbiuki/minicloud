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
	    if (body.latitude) {
		    event.latitude = body.latitude;
	    }
	    if (body.longitude) {
		    event.longitude = body.longitude;
	    }
	    if (body.altitude) {
		    event.altitude = body.altitude;
	    }
	}

	if (event.latitude === null || event.latitude === undefined) {
		returnResult(callback, 400, "Missing latitude in Body");
		return;
	}
	
	if (event.longitude === null || event.longitude === undefined) {
		returnResult(callback, 400, "Missing longitude in Body");
		return;
	}
	
	if (event.altitude === null || event.altitude === undefined) {
		returnResult(callback, 400, "Missing altitude in Body");
		return;
	}

	let payload = {};
	let date = new Date();
	payload.timeStampEpoch = date.getTime();
	payload.timeStampIso = date.toISOString();
	payload.latitude = event.latitude;
	payload.longitude = event.longitude;
	payload.altitude = event.altitude;

	const params = {
		topic: 'sensor/gps/payload',
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