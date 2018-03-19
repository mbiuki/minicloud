const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.CLIENT_ID);
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
const table = "UserTable";
const numCommands = 3;
const commandRefreshTime = 3600 * 24 * 1000 // Can send 3 commands on a per day basis

exports.handler = (event, context, callback) => {
	var token = event.authorizationToken;
	if (!token) {
		if (event.headers !== null && event.headers !== undefined) {
			token = event.headers["authorizationToken"];
		}
	}

	// If user supplies admin password, just allow right away.
	if (token == process.env.PASSWORD) {
		callback(null, generatePolicy('user', 'Allow', event.methodArn));
		return;
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

		let getParams = {
			TableName: table,
			Key: {
				'id': userid,
			},
		};

		// Call DynamoDB to read the item from the table
		dynamo.getItem(getParams, function(err, data) {
			if (err) {
				console.log("Error", err);
				callback(err);
				return;
			} else {
				console.log("Success", data.Item);

				// If no previous entry for this Google account, set their default number of commands to send
				// and the time when we assigned them the number of available commands. 
				if (!data.Item) {

					let putParams = {
						TableName: table,
						Item: {
							'id': userid,
							'payload': payload,
							'numCommands': numCommands - 1,
							'timeAssigned': (new Date).getTime(),
						}
					};

					dynamo.putItem(putParams, function(err, data) {
						if (err) {
							console.log(err);
							callback(err);
							return;
						} else {
							console.log(data);
							callback(null, generatePolicy('user', 'Allow', event.methodArn));
							return;
						}
					});
					// Previous entry exists for this Google ID
				} else {
					let updateParams = {
						TableName: table,
						Key: {
							'id': userid,
						},
					};

					// Check if user is out of commands
					if (data.Item.numCommands <= 0) {
						let currTime = (new Date).getTime();
						let nextTime = new Date(data.Item.timeAssigned + commandRefreshTime);
						// Check if can refresh number of commands
						if (currTime >= nextTime) {
							updateParams["UpdateExpression"] = "set numCommands = :n, set timeAssigned = :d";
							updateParams["ExpressionAttributeValues"] = { ":n": numCommands - 1, ":d": currTime};
						} else {
							console.log("No commands left to be sent. Please wait until " + nextTime);
							callback(null, generatePolicy('user', 'Deny', event.methodArn));
							return;
						}
					}
					// If commands available, decrement them.
					else {
						updateParams["UpdateExpression"] = "set numCommands = numCommands - :val";
						updateParams["ExpressionAttributeValues"] = { ":val": 1 };
					}

					dynamo.updateItem(updateParams, function(err, data) {
						if (err) {
							console.log(err);
							callback(err);
							return;
						} else {
							console.log(data);
							callback(null, generatePolicy('user', 'Allow', event.methodArn));
							return;
						}
					});

				}
			}
		});
	}).catch(function(err) {
		console.log(err);
		callback(err);
	});
};

// Help function to generate an IAM policy
var generatePolicy = function(principalId, effect, resource) {
	var authResponse = {};

	authResponse.principalId = principalId;
	if (effect && resource) {
		var policyDocument = {};
		policyDocument.Version = '2012-10-17';
		policyDocument.Statement = [];
		var statementOne = {};
		statementOne.Action = 'execute-api:Invoke';
		statementOne.Effect = effect;
		statementOne.Resource = resource;
		policyDocument.Statement[0] = statementOne;
		authResponse.policyDocument = policyDocument;
	}

	return authResponse;
}