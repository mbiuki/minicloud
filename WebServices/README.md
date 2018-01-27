## Lambda Functions
Table below shows what each Lambda function does. The GET functions require DynamoDB read IAM permissions. `SetSensorStatus` and `TakePicture` require AWS IotData publish IAM permissions, as well as setting the Lambda environment variable `AWS_IOT_ENDPOINT` to your AWS IoT Endpoint.

| Function  | Description | API Gateway Example Usage |
| ------------- | ------------- | ------------- |
| GetSensorCurrStatus  | Gets the current status of the sensors. No parameters.| GET https://uniqueid.execute-api.us-west-2.amazonaws.com/prod/currstatus |
| GetSensorStatus  | Query past data for a given sensor (path parameter) and time range (timestart, timeend in unix time as query parameters). | GET https://unique.execute-api.us-west-2.amazonaws.com/prod/status/motion?timestart=0&timeend=1512024820868 |
| SetSensorStatus | Send command to set status (body parameter) of sensor (path parameter). | PUT https://uniqueid.execute-api.us-west-2.amazonaws.com/prod/setstatus/led With “status”: “1” in the body |
| TakePicture | Send command to take picture. No parameters.| POST https://uniqueid.execute-api.us-west-2.amazonaws.com/prod/takepicture |
| GetCurrImage | Get url and labels of last picture taken. No parameters. | GET https://uniqueid.execute-api.us-west-2.amazonaws.com/prod/getpicture |

## API Gateway Setup
All API Gateway mappings to these Lambda functions need to be a Lambda Proxy Integration. Enable CORS for all PUT/POST methods.
* `GetSensorCurrStatus` and `GetCurrImage` is setup by creating for each of them a new resource in your API. Then add to each resource a GET method that maps to the appropriate Lambda function. 
* `TakePicture` is also setup by creating a new resource, but adding a POST method instead. 
* `GetSensorStatus` is setup by creating a new proxy resource (since it takes a sensor ID in the path parameter), and then adding a GET method that maps to the created Lambda function.
* `SetSensorStatus` is also setup as a proxy resource, and then adding a PUT method. 

## DynamoDB Setup
`GetSensorCurrStatus`, `GetSensorStatus`, and `GetCurrImage` each query 3 different DynamoDB tables as shown in the code. 
* `GetSensorCurrStatus` and `GetCurrImage` both require separate tables, called `SensorCurrTable` and `CurrImageTable` respectively, each with a primary partiton key of sensorId (String). No sort key needed for either. Use default settings.
* `GetSensorStatus` requires a table called `SensorTable` with a primary partiton key of sensorId (String) and a primary sort key of payloadTimestamp (String). Use default settings.

## IoT Rules
IoT Rules can be setup to automatically persist IoT publish messages that match a filter to DynamoDB 
* For populating the `SensorCurrTable` and `SensorTable`, create a new IoT rule. Put Attribute as '*'. Put topic filter as `sensor/+/payload`. This will take all IoT data being published to that topic payload, and grabs all the fields of it. Leave condition empty. Add an action to  `Insert a message into a DynamoDB table`. Choose table `SensorCurrTable` first, and set the Hash key value as string `${topic(2)}`. This refers to the wildcard string in `sensor/+/payload`. Update IAM roles as necessary and save the rule. Add another action in the same rule to insert into Dynamo, but choose `SensorTable` this time. Hash key value is also string `${topic(2)}`. The range key value (since this table has a sort key) is NUMBER `${timeStampEpoch}`. Finish creating the rule.
* For populating the `CurrImageTable`, create a new IoT rule. Put Attribute as '*'. Put topic filter as `sensor/camera/image` (we expect this to be the topic that new camera images are sent to). Add a new DynamoDB action and choose table `CurrImageTable`. Hash key value is string `${topic(2)}` again.
