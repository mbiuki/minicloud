# Setup
### Install Boto 3

http://boto3.readthedocs.io/en/latest/guide/quickstart.html

### Install AWS IoT Python SDK

`pip install AWSIoTPythonSDK`

See https://github.com/aws/aws-iot-device-sdk-python for more

# Run
python maindriver.py -e [AWS IoT Endpoint] -r [Root CA] -c [Certificate] -k [Private Key] -s [S3 Bucket Name]
