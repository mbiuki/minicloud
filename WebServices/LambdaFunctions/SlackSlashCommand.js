var aws = require('aws-sdk');
var lambda = new aws.Lambda({
	region: 'us-west-2'
});
var qs = require('querystring');


function returnResult(callback, statusCode, body) {
	callback(null, {
		statusCode: statusCode,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: body
	});
}

exports.handler = (event, context, callback) => {
	var slackBody = qs.parse(event.body);
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
					returnResult(callback, 200, "Picture taken");
				}
			});
			break;
		case "/setsensor":
		    var params = slackBody.text.split(' ');
		    console.log(params);

		    var sensorId = params[0];
		    var status = params[1];
		    console.log(sensorId);
		    console.log(status);
		    
		    lambda.invoke({
				FunctionName: 'SetSensorStatus',
				Payload: JSON.stringify({"sensorId": sensorId, "status": status})
			}, function(error, data) {
				if (error) {
					returnResult(callback, 400, "Error trying to set sensor status");
				}
				if (data.Payload) {
					returnResult(callback, 200, "Sensor status set");
				}
			});
			break;
	}
};