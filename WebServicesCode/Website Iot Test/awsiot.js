var AWS = require('aws-sdk');
var awsIot = require('aws-iot-device-sdk');

var awsConfiguration = {
	poolId: "", // 'YourCognitoIdentityPoolId'
	host: "", // 'YourAWSIoTEndpoint', e.g. 'prefix.iot.us-east-1.amazonaws.com'
	region: "us-west-2" // 'YourAwsRegion', e.g. 'us-east-1'
};

//
// Initialize our configuration.
//
AWS.config.region = awsConfiguration.region;
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
	IdentityPoolId: awsConfiguration.poolId
});

// Create the AWS IoT device object.  Note that the credentials must be 
// initialized with empty strings; when we successfully authenticate to
// the Cognito Identity Pool, the credentials will be dynamically updated.
//
const mqttClient = awsIot.device({
	//
	// Set the AWS region we will operate in.
	//
	region: AWS.config.region,
	//
	////Set the AWS IoT Host Endpoint
	host: awsConfiguration.host,
	//
	// Use the clientId created earlier.
	//
	clientId: "test",
	//
	// Connect via secure WebSocket
	//
	protocol: 'wss',
	//
	// Set the maximum reconnect time to 8 seconds; this is a browser application
	// so we don't want to leave the user waiting too long for reconnection after
	// re-connecting to the network/re-opening their laptop/etc...
	//
	maximumReconnectTimeMs: 8000,
	//
	// Enable console debugging information (optional)
	//
	debug: true,
	//
	// IMPORTANT: the AWS access key ID, secret key, and sesion token must be 
	// initialized with empty strings.
	//
	accessKeyId: '',
	secretKey: '',
	sessionToken: ''
});

var cognitoIdentity = new AWS.CognitoIdentity();
AWS.config.credentials.get(function(err, data) {
	if (!err) {
		console.log('retrieved identity: ' + AWS.config.credentials.identityId);
		var params = {
			IdentityId: AWS.config.credentials.identityId
		};
		cognitoIdentity.getCredentialsForIdentity(params, function(err, data) {
			if (!err) {
				//
				// Update our latest AWS credentials; the MQTT client will use these
				// during its next reconnect attempt.
				//
				mqttClient.updateWebSocketCredentials(
					data.Credentials.AccessKeyId,
					data.Credentials.SecretKey,
					data.Credentials.SessionToken
				);
			} else {
				console.log('error retrieving credentials: ' + err);
				alert('error retrieving credentials: ' + err);
			}
		});
	} else {
		console.log('error retrieving identity:' + err);
		alert('error retrieving identity: ' + err);
	}
});

module.exports = mqttClient;