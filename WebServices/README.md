## Lambda Functions
The table below shows what each Lambda function does. The GET functions require DynamoDB read IAM permissions. `UpdateBarometer` and `UpdateGPS` require AWS IotData publish IAM permissions, as well as setting the Lambda environment variable `AWS_IOT_ENDPOINT` to your AWS IoT Endpoint.

| Function  | Description | API Gateway Example Usage |
| ------------- | ------------- | ------------- |
| GetSensorCurrStatus  | Gets the current status of the sensors. No parameters.| GET https://uniqueid.execute-api.us-west-2.amazonaws.com/dev/GetSensorCurrStatus|
| GetDroneSensorStatus  | Query past data for a given `sensorId` (path parameter) and time range (`timestart`, `timeend` in unix time as query parameters). | GET https://unique.execute-api.us-west-2.amazonaws.com/dev/GetDroneSensorStatus/barometer?timestart=0&timeend=1512024820868 |
| UpdateBarometer | Update to the cloud the temperature and pressure. Requires `temp` and `pressure` parameters in the body. | PUT https://uniqueid.execute-api.us-west-2.amazonaws.com/dev/UpdateBarometer |
| UpdateGPS | Update to the cloud the latitude, longitude and altitude. Requires `latitude`, `longitude` and `altitude` parameters in the body. | PUT https://uniqueid.execute-api.us-west-2.amazonaws.com/dev/UpdateGPS |
| CheckGoogleOauth | This Lambda function is automatically invoked prior to each API request to send a command. It checks the provided Google OAuth token in the `authorizationToken` header field to see if it is valid. If so, decrement the number of commands the user has available. Otherwise, reject the call. Set the `CLIENT_ID` environment variable to the client ID from the created Google API Project. Set the `PASSWORD` environment variable to the admin password. Requires the `google-auth-library` node module, so this Lambda Function needs to be zipped up with the module, and cannot be pasted into the editor. | Not meant to be used as an API Gateway endpoint. |
| CheckToken | Similar to CheckGoogleOAuth, but only allows for admin password instead. Set the `PASSWORD` environment variable to the admin password. | Not meant to be used as an API Gateway endpoint. |
| ProcessFrames | Grabs a frame from the kinesis stream, calls the rekognition API on the image and draws the label bounding boxes on the image, the resulting image is returned in base64 format. The access and secret keys need to be set as environment variables.| GET https://uniqueid.execute-api.us-west-2.amazonaws.com/dev/GetProcessedFrames |

## API Gateway Setup
All API Gateway mappings to these Lambda functions need to be a Lambda Proxy Integration. Enable CORS for all PUT/POST methods.
* `GetSensorCurrStatus` is setup by creating a new resource in your API. Call it `GetSensorCurrStatus`. Then add to each resource a GET method that maps to the appropriate Lambda function. 
* `GetDroneSensorStatus` is setup by creating a resource called `GetDroneSensorStatus`. Then create a new proxy resource under that. Proxy means the string after the resource path. In our case, we want sensor ID in the path, so we use proxy here. Then add a GET method under the proxy resource that maps to the `GetDroneSensorStatus` Lambda function.
* `UpdateGPS` and `UpdateBarometer` is setup by creating a new resource called `UpdateGPS` and `UpdateBarometer` respectively (enable CORS). Then, add a `PUT` method.

## Secure API Endpoints
In API Gateway, create a new Authorizer called `CheckGoogleOAuth`. Select `Lambda` as the type. Choose `CheckGoogleOAuth` as the Lambda Function. Leave `Lambda Invoke Rule` blank. Select `Token` as the `Lambda Event Payload`. Enter `authorizationToken` as the `Token Source`. Ensure caching is disabled, and finish creating the Authorizer. Do the same for `CheckToken`, which simply checks for an admin password instead. `CheckGoogleOAuth` will be used on APIs that users can call, while `CheckToken` are for APIs that are meant to be used internally. 

Under the resources tree, select the labels with PUT or POST. Any APIs that manipulate data should have locked down access. Then select `Method Request`. Choose the newly created `CheckGoogleOAuth` or `CheckToken` authorizer in the `Authorization` dropdown and press the check mark. `SetSensorStatus` and `TakePicture` should use `CheckGoogleOAuth` as the authorizer since these APIs map to available commands from the website while `UpdateTemp` and `PublishImage` should use `CheckToken`, since they are used internally within the system.

## DynamoDB Setup
`GetSensorCurrStatus`, `GetDroneSensorStatus`, `CheckGoogleOAuth` each query 3 different DynamoDB tables as shown in the code. 
* `GetSensorCurrStatus` requires a separate table called `SensorCurrTable` with a primary partiton key of sensorId (String). No sort key needed for either. Use default settings.
* `GetDroneSensorStatus` requires a table called `DroneSensorTable` with a primary partiton key of sensorId (String) and a primary sort key of payloadTimestamp (String). Use default settings.
* `CheckGoogleOAuth` requires a table called `UserTable` with a primary partition key of id (String). No sort key needed. Use default settings.

## IoT Rules
IoT Rules can be setup to automatically persist IoT publish messages that match a filter to DynamoDB, or invoke Lambda functions upon the new sensor data. 
* For populating the `SensorCurrTable` and `DroneSensorTable`, create a new IoT rule. Put Attribute as '*'. Put topic filter as `sensor/+/payload`. This will take all IoT data being published to that topic payload, and grabs all the fields of it. Leave condition empty. Add an action to  `Insert a message into a DynamoDB table`. Choose table `SensorCurrTable` first, and set the Hash key value as string `${topic(2)}`. This refers to the wildcard string in `sensor/+/payload`. Update IAM roles as necessary and save the rule. Add another action in the same rule to insert into Dynamo, but choose `DroneSensorTable` this time. Hash key value is also string `${topic(2)}`. The range key value (since this table has a sort key) is string `${timeStampEpoch}`. Update IAM role. Finish creating the rule.
