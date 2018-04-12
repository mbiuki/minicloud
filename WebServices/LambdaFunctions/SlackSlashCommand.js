var aws = require('aws-sdk');
var lambda = new aws.Lambda({
	region: 'us-west-2'
});
var qs = require('querystring');
const acceptedSensors = ["led"];

function returnResult(callback, statusCode, body) {
	callback(null, {
		statusCode: statusCode,
		body: body
	});
}

exports.handler = (event, context, callback) => {
	let slackBody = qs.parse(event.body);
	if (slackBody.token != process.env.SLACK_TOKEN) {
		returnResult(callback, 400, "Invalid token");
	}
	switch (slackBody.command) {
		case "/takepicture":
			lambda.invoke({
				FunctionName: 'TakePicture'
			}, function(error, data) {
				if (error) {
					returnResult(callback, 400, "Error trying to take picture");
				}
				if (data.Payload) {
					returnResult(callback, 200, JSON.stringify({ "response_type": "in_channel", text: "Picture taken" }));
				}
			});
			break;
		case "/setsensor":
			let params = slackBody.text.split(' ');
			let sensorId = params[0];
			let status = params[1];

			if (acceptedSensors.indexOf(sensorId) < 0) {
				returnResult(callback, 200, "Not an accepted sensor to modify status");
				return;
			}

			if (status != 0 && status != 1) {
				returnResult(callback, 200, "Invalid sensor status");
				return;
			}

			lambda.invoke({
				FunctionName: 'SetSensorStatus',
				Payload: JSON.stringify({ "sensorId": sensorId, "status": status })
			}, function(error, data) {
				if (error) {
					returnResult(callback, 400, "Error trying to set sensor status");
				}
				if (data.Payload) {
					returnResult(callback, 200, JSON.stringify({ "response_type": "in_channel", text: "Sensor status set" }));
				}
			});
			break;
		case "/getstatus":
			lambda.invoke({
				FunctionName: 'GetSensorCurrStatus',
			}, function(error, data) {
				if (error) {
					returnResult(callback, 400, "Error trying to get sensor status");
				}
				if (data.Payload) {
					let payload = JSON.parse(data.Payload);
					payload = JSON.parse(payload.body)
					let text = "";
					for (var i = 0; i < payload.Items.length; i++) {
						var item = payload.Items[i].payload;
						if (item["sensorId"] == "led") {
							text += "*LED*: ";
							if (item["status"] == "1") {
								text += "On\n";
							} else {
								text += "Off\n";
							}
						}
						if (item["sensorId"] == "motion") {
							text += "*Motion Sensor*: ";
							if (item["status"] == "1") {
								text += "Motion Detected\n";
							} else {
								text += "No Motion Detected\n";
							}
						}
						if (item["sensorId"] == "temp") {
							text += "*Temperature*: " + item["temp"] + "\xB0C\n";
							text += "*Humidity*: " + item["humidity"] + "%\n";
						}
					}
					returnResult(callback, 200, JSON.stringify({ "response_type": "in_channel", text: text }));
				}
			});

	}
};