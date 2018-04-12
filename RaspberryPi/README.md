# Setup
### Install Boto 3

http://boto3.readthedocs.io/en/latest/guide/quickstart.html

### Install AWS IoT Python SDK

`pip install AWSIoTPythonSDK`

See https://github.com/aws/aws-iot-device-sdk-python for more

### Connect Raspberry Pi to AWS IoT

Follow these instructions https://docs.aws.amazon.com/iot/latest/developerguide/iot-sdk-setup.html to get the root CA, certificate, and public and private keys. 

# Run
`python maindriver.py -e [AWS IoT Endpoint] -r [Root CA] -c [Certificate] -k [Private Key] -s [S3 Bucket Name] -a [API Gateway Endpoint] -p [API Gateway Password]`
