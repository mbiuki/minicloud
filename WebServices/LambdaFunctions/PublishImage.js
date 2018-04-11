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
		if (body.url) {
			event.url = body.url;
		}
		if (body.labels) {
			event.labels = body.labels;
		}
		if (body.sender) {
			event.sender = body.sender;
		}
	}

	if (event.url === null || event.url === undefined) {
		returnResult(callback, 400, "Missing URL in Body");
		return;
	}
	if (event.labels === null || event.labels === undefined) {
		returnResult(callback, 400, "Missing labels in Body");
		return;
	}

	let payload = {};
	let date = new Date();
	payload.timeStampEpoch = date.getTime();
	payload.timeStampIso = date.toISOString();
	payload.url = event.url;
	payload.labels = event.labels;
	payload.sender = event.sender;

	const params = {
		topic: 'sensor/camera/image',
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