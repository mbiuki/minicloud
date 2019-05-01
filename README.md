# AWS_IOT
Drone IOT Database for constrained devices


### Frontend
* Written in JS with Chart.js for graphing sensor data. Uses AWS IoT SDK (with Browserify) for IoT topic subscribes.

* Consumes AWS API Gateway endpoints to query data and perform IoT publishes. 

* Features: Current sensor status, graphing sensor data in a custom time range, displaying Video Stream from Kinesis Video Streamer.

* Has Google Signin integrated to authenticate users sending commands to the system.

* Readme inside contains more details of setup.

### Web Services
* Contains the Node.js functions to upload to AWS Lambda that can query sensor data from DynamoDB and perform authenticating API requests through Google OAuth tokens.

* These need to be mapped to an AWS API Gateway endpoint (Proxy Integration). Readme inside contains more details. See http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-lambda.html as well for official documentations.

### Raspberry Pi
* The Python code that the Raspberry Pi device (uses Barometer and GPS sensor) runs. Connects to AWS IoT SDK and performs subscribe/publishes. Uses AWS Kinesis Video Streamer to stream Raspberry Pi camera video to AWS.

* For example, emitting Temperature, Pressure sensor status. 

### Architecture

<img src="https://github.com/mbiuki/minicloud/blob/drone_AWS/Architecture/Drone_IoT.png" alt="Screenshot" border="10"/>
