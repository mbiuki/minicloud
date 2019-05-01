# Setup
### Install AWS Kinesis Video Stream Producer SDK

`git clone https://github.com/awslabs/amazon-kinesis-video-streams-producer-sdk-cpp`

Follow the instructions on https://github.com/awslabs/amazon-kinesis-video-streams-producer-sdk-cpp
This will help in streaming videos to AWS Kinesis Video Stream from Raspberry Pi

Set-Up a video stream on Kinesis to recieve the credentials and instructions https://aws.amazon.com/kinesis/video-streams/raspberry-pi-tutorial/

### Install AWS IoT Python SDK

`pip install AWSIoTPythonSDK`

See https://github.com/aws/aws-iot-device-sdk-python for more

### Connect Raspberry Pi to AWS IoT

Follow these instructions https://docs.aws.amazon.com/iot/latest/developerguide/iot-sdk-setup.html to get the root CA, certificate, and public and private keys. 

# Run
`python main.py -e [AWS IoT Endpoint] -r [Root CA] -c [Certificate] -k [Private Key] -s [S3 Bucket Name] -a [API Gateway Endpoint] -p [API Gateway Password]`
