
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

### Installation
```
npm install
npm install -g browserify
browserify app.js -o bundle.js
```
Browserify is required to use the AWS IoT node libraries in the frontend. Whenever JS changes are made, run `browserify app.js -o bundle.js` again.
