
### Credentials setup
Create a file called 'credentials.js' in this directory.
```
var config = {
	poolId: "", // 'YourCognitoIdentityPoolId'
	host: "", // 'YourAWSIoTEndpoint', e.g. 'prefix.iot.us-east-1.amazonaws.com'
	region: "", // e.g 'us-west-2'
	endpoint : "", // API Gateway endpoint e.g. 'https://prefix-api.us-west-2.amazonaws.com/prod'
	slackWebhook : "", // Slack Incoming Webhook URL e.g. "https://hooks.slack.com/services/test/test/test" 
};

module.exports = config;
```

The `poolId` refers to the Identity pool ID created from Federated Identities in AWS Cognito. It gives the credentials for the website to access AWS IoT. Create an unautheticated role, and make sure it has IAM permissions to AWS IoT, and use its pool ID. See equivalent instructions for setting up the Identity pool here https://github.com/aws/aws-iot-device-sdk-js#temperature-monitor-browser-example-application. We allow any user to access our website, so restrict access in the Cognito IAM role as needed. 

The `slackWebhook` is optional, as a bonus feature, if forwarding received images and labels from the website to a Slack channel is so desired. 

### Installation
```
npm install
npm install -g browserify
browserify awsiot.js --standalone mqttClient > bundle.js
```
Browserify is required to use the AWS IoT node libraries in the frontend. If you change your credentials, run the last command again.

To run the above press shift, click on open power shell in Windows.

### Running Locally 
Since Google Sign in has been implemented (which uses async requests), you need to serve the files here on a server for proper local testing. You can use `http-server` (https://github.com/indexzero/http-server) from Node.js, or `SimpleHTTPServer` (https://developer.mozilla.org/en-US/docs/Learn/Common_questions/set_up_a_local_testing_server#Running_a_simple_local_HTTP_server) from Python to do so. 
