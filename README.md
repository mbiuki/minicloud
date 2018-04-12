# MiniCloud
MiniCloud Database for constrained devices


### Frontend
* Written in JS with Chart.js for graphing sensor data. Uses AWS IoT SDK (with Browserify) for IoT topic subscribes.

* Consumes AWS API Gateway endpoints to query data and perform IoT publishes. 

* Features: Toggle LED, Take Picture, current sensor status, graphing sensor data in a custom time range, displaying camera images from the Pi with computer vision analysis.

* Has Google Signin integrated to authenticate users sending commands to the system.

* Readme inside contains more details of setup.

### Web Services
* Contains the Node.js functions to upload to AWS Lambda that can query sensor data from DynamoDB and perform IoT publishes (Set LED, Take picture) as well as handling the Slack Integration and authenticating API requests through Google OAuth tokens.

* These need to be mapped to an AWS API Gateway endpoint (Proxy Integration). Readme inside contains more details. See http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-lambda.html as well for official documentations.

### Raspberry Pi
* The Python code that the Raspberry Pi device (uses camera, motion sensor, LED, light sensor) runs. Connects to AWS IoT SDK and performs subscribe/publishes. Uses AWS S3 for storage, and AWS Rekognition for computer vision analysis.

* For example, listening to taking picture requests from the website, or emitting light sensor status. 

* Uploads pictures taken to S3, and also analyzes them using AWS Rekognition to check for humans. The picture URL and resulting computer vision labels are sent to the website via an IoT publish. 

### Architecture

<img src="https://github.com/mbiuki/minicloud/blob/master/Architecture/Iot.jpg" alt="Screenshot" border="10"/>
