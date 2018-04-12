## Lambda Functions
The table below shows what each Lambda function does. The GET functions require DynamoDB read IAM permissions. `SetSensorStatus` and `TakePicture` require AWS IotData publish IAM permissions, as well as setting the Lambda environment variable `AWS_IOT_ENDPOINT` to your AWS IoT Endpoint.

| Function  | Description | API Gateway Example Usage |
| ------------- | ------------- | ------------- |
| GetSensorCurrStatus  | Gets the current status of the sensors. No parameters.| GET https://uniqueid.execute-api.us-west-2.amazonaws.com/prod/currstatus |
| GetSensorStatus  | Query past data for a given `sensorId` (path parameter) and time range (`timestart`, `timeend` in unix time as query parameters). | GET https://unique.execute-api.us-west-2.amazonaws.com/prod/status/motion?timestart=0&timeend=1512024820868 |
| SetSensorStatus | Send command to set `status` (body parameter) of a `sensorId` (path parameter). | PUT https://uniqueid.execute-api.us-west-2.amazonaws.com/prod/setstatus/led With “status”: “1” in the body |
| TakePicture | Send command to take picture. No parameters.| POST https://uniqueid.execute-api.us-west-2.amazonaws.com/prod/takepicture |
| GetCurrImage | Get url and labels of last picture taken. No parameters. | GET https://uniqueid.execute-api.us-west-2.amazonaws.com/prod/getpicture |
| PublishImage | Update to the cloud the URL of the last picture taken, as well as the associating computer vision labels. Requires `url` and `labels` parameters in the body. | PUT https://uniqueid.execute-api.us-west-2.amazonaws.com/prod/publishimage |
| UpdateTemperature | Update to the cloud the temperature and humidity. Requires `temp` and `humidity` parameters in the body. | PUT https://uniqueid.execute-api.us-west-2.amazonaws.com/prod/updatetemperature |
| CheckGoogleOauth | This Lambda function is automatically invoked prior to each API request to send a command. It checks the provided Google OAuth token in the `authorizationToken` header field to see if it is valid. If so, decrement the number of commands the user has available. Otherwise, reject the call. Set the `CLIENT_ID` environment variable to the client ID from the created Google API Project. Set the `PASSWORD` environment variable to the admin password. | Not meant to be used in API Gateway. |
| CheckToken | Similar to CheckGoogleOAuth, but only allows for admin password instead. Set the `PASSWORD` environment variable to the admin password. | Not meant to be used in API Gateway. |
| SlackSlashCommand | This is invoked whenever the user uses a Slash Command in Slack. Not meant to be used anywhere other than through Slack (a token is checked when making this call). Set the `SLACK_TOKEN` environment variable to the Verification Token from creating the Slash Command.| POST https://uniqueid.execute-api.us-west-2.amazonaws.com/prod/slackslashcommand |
| SendSensorDataToSlack | An IoT Rule invokes this Lambda function whenever a sensor publishes updated data to AWS IoT. Set the `SLACK_WEBHOOK` environment variable to the webhook URL from creating the Slack incoming webhook. | Not meant to be used in API Gateway. |

## API Gateway Setup
All API Gateway mappings to these Lambda functions need to be a Lambda Proxy Integration. Enable CORS for all PUT/POST methods.
* `GetSensorCurrStatus` and `GetCurrImage` is setup by creating for each of them a new resource in your API. Call them `currstatus` and `getpicture` respectively. Then add to each resource a GET method that maps to the appropriate Lambda function. 
* `TakePicture` is also setup by creating a new resource called `takepicture` (make sure to enable CORS), but adding a POST method instead. 
* `GetSensorStatus` is setup by creating a resource called `status`. Then create a new proxy resource under that. Proxy means the string after the resource path. In our case, we want sensor ID in the path, so we use proxy here. Then add a GET method under the proxy resource that maps to the `GetSensorStatus` Lambda function.
* `SetSensorStatus` is setup by creating a new resource called `setstatus`. Then create a new proxy resource under that (enable CORS), and add a PUT method to the `SetSensorStatus` Lambda Function.
* `PublishImage` and `UpdateTemperature` is setup by creating a new resource called `publishimage` and `updatetemp` respectively (enable CORS). Then, add a `PUT` method.
* `SlackSlashCommand` is only meant to be called from Slack. This will be the endpoint that all Slash Sommands will hit. As mentioned, a token is checked to ensure it is called from within Slack. Create a new resource `Slack` and add a `POST` method. 

## Secure API Endpoints
In Api Gateway, create a new Authorizer called `CheckGoogleOAuth`. Select `Lambda` as the type. Choose `CheckGoogleOAuth` as the Lambda Function. Leave `Lambda Invoke Rule` blank. Select `Token` as the `Lambda Event Payload`. Enter `authorizationToken` as the `Token Source`. Ensure caching is disabled, and finish creating the Authorizer. Do the same for `CheckToken`, which simply checks for an admin password instead. `CheckGoogleOAuth` will be used on APIs that users can call, while `CheckToken` are for APIs that are meant to be used internally. 

Under the resources tree, select the labels with PUT or POST. Any APIs that manipulate data should have locked down access. Then select `Method Request`. Choose the newly created `CheckGoogleOAuth` or `CheckToken` authorizer in the `Authorization` dropdown and press the check mark. `SetSensorStatus` and `TakePicture` should use `CheckGoogleOAuth as the authorizer since these APIs map to available commands from the website while `UpdateTemp` and `PublishImage` should use `CheckToken`, since they are used internally within the system.

## Slack App Setup
Go to https://api.slack.com/apps and create a new app. Choose a name and select a workspace. We use both Slash Commands and Incoming webhooks. 
* To set up Slash Commands, create 3 new commands called `takepicture`, `setsensor`, and `getstatus` respectively. Set the `request URL` to the created API endpoint for `SlackSlashCommand`. As mentioned, the resulting `Verification Token` from creating the app is the `Slack_TOKEN` environment variable used in the Lambda Function `SlackSlashCommand`.
* To set up Incoming Webhooks, activate incoming webhooks, and add a new webhook to a chosen workspace. As mentioned, the resulting `Webhook URL` is the `SLACK_WEBHOOK` environment variable used in the Lambda Function `SendSensorDataToSlack`.

## DynamoDB Setup
`GetSensorCurrStatus`, `GetSensorStatus`, `GetCurrImage`, and `CheckGoogleOAuth` each query 4 different DynamoDB tables as shown in the code. 
* `GetSensorCurrStatus` and `GetCurrImage` both require separate tables, called `SensorCurrTable` and `CurrImageTable` respectively, each with a primary partiton key of sensorId (String). No sort key needed for either. Use default settings.
* `GetSensorStatus` requires a table called `SensorTable` with a primary partiton key of sensorId (String) and a primary sort key of payloadTimestamp (String). Use default settings.
* `CheckGoogleOAuth` requires a table called `UserTable` with a primary partition key of id (String). No sort key needed. Use default settings.

## IoT Rules
IoT Rules can be setup to automatically persist IoT publish messages that match a filter to DynamoDB, or invoke Lambda functions upon the new sensor data. 
* For populating the `SensorCurrTable` and `SensorTable`, create a new IoT rule. Put Attribute as '*'. Put topic filter as `sensor/+/payload`. This will take all IoT data being published to that topic payload, and grabs all the fields of it. Leave condition empty. Add an action to  `Insert a message into a DynamoDB table`. Choose table `SensorCurrTable` first, and set the Hash key value as string `${topic(2)}`. This refers to the wildcard string in `sensor/+/payload`. Update IAM roles as necessary and save the rule. Add another action in the same rule to insert into Dynamo, but choose `SensorTable` this time. Hash key value is also string `${topic(2)}`. The range key value (since this table has a sort key) is string `${timeStampEpoch}`. Update IAM role. Finish creating the rule.
* For populating the `CurrImageTable`, create a new IoT rule. Put Attribute as '*'. Put topic filter as `sensor/camera/image` (we expect this to be the topic that new camera images are sent to). Add a new DynamoDB action and choose table `CurrImageTable`. Hash key value is string `${topic(2)}` again.
* In order for the Slack channel to receive sensor updates in real time, create a new IoT rule. Add an action to `Invoke a Lambda function passing the message data`. Select `SendSensorDataToSlack`. Update IAM role. Finish creating the rule.

# S3 Setup
Simply create a bucket in S3 with default settings. The name of this bucket will be referenced as a parameter in the Python code. 
