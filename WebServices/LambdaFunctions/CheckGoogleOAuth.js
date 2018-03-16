const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.CLIENT_ID);
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
const table = "UserTable";

function returnResult(callback, statusCode, body) {
	callback(null, {
		statusCode: statusCode,
		body: JSON.stringify(body)
	});
}

exports.handler = (event, context, callback) => {
	let token = event.token;
	if (event.body) {
		let body = JSON.parse(event.body);
		if (body.token) {
			token = body.token;
		}
	}
	console.log(event);
	const ticket = client.verifyIdToken({
		idToken: token,
		audience: process.env.CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
		// Or, if multiple clients access the backend:
		//[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
	});

	ticket.then(function(result) {
		console.log(result);
		const payload = result.getPayload();
		const userid = payload['sub'];

		var params = {
			TableName: table,
			Item: {
				'id': userid,
				'timestamp': (new Date).getTime().toString(),
				'payload': payload,
			}
		};

		// Call DynamoDB to add the item to the table
		dynamo.putItem(params, function(err, data) {
			if (err) {
				console.log(err);
				returnResult(callback, 400, err);
			} else {
				console.log(data);
				returnResult(callback, 200, data);
			}
		});
		// If request specified a G Suite domain:
		//const domain = payload['hd'];
	}).catch(function(err) {
		console.log(err);
		returnResult(callback, 400, err);
	});
};