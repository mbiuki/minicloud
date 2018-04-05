exports.handler = function(event, context, callback) {
	var token = event.authorizationToken;
	if (!token) {
		if (event.headers !== null && event.headers !== undefined) {
			token = event.headers["authorizationToken"];
		}
	}
	if (!token) {
		callback("Error: No Token provided");
	}

	switch (token.toLowerCase()) {
		case process.env.PASSWORD:
			callback(null, generatePolicy('user', 'Allow', event.methodArn));
			break;
		default:
			callback("Error: Invalid token");
	}
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