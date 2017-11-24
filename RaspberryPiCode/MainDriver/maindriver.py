from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
from gpiozero import MotionSensor
from picamera import PiCamera
from random import randint
import logging
import datetime
import time
import argparse
import json
import boto3
import RPi.GPIO as GPIO


# Custom MQTT message callback
def motionCallback(client, userdata, message):
    print("Received a new message: ")
    print(message.payload)
    print("from topic: ")
    print(message.topic)
    payload = json.loads(message.payload)
    if payload["status"] == '1':
        imagePath = datetime.datetime.now().isoformat() + ".png"
        camera.capture(imagePath)
        image = open(imagePath, "rb")
        
        # Upload camera image to S3, and grab the url
        s3Resource.Bucket('minicloud-images').put_object(Key=imagePath, Body=image)
        url = s3Client.generate_presigned_url('get_object',
                                Params={
                                    'Bucket': 'minicloud-images',
                                    'Key': imagePath
                                }
        )                                      
        print(url)
        
        # Send the image url in an IoT Publish
        myAWSIoTMQTTClient.publishAsync("sensor/camera/image", json.dumps({"url":url}), 1)
        
    print("--------------\n\n")

def ledCallback(client, userdata, message):
    print("Received a new message: ")
    print(message.payload)
    print("from topic: ")
    print(message.topic)
    payload = json.loads(message.payload)
    if payload["status"] == '1':
        print("LED ON")
        GPIO.output(18,GPIO.HIGH)
    else:
        print("LED OFF")
        GPIO.output(18,GPIO.LOW)
    print("--------------\n\n")

def getBaseMessage():
    message = {}
    message["timeStampEpoch"] = int(time.time() * 1000)
    message["timeStampIso"] = datetime.datetime.now().isoformat()
    return message

# Read in command-line parameters
parser = argparse.ArgumentParser()
parser.add_argument("-e", "--endpoint", action="store", required=True, dest="host", help="Your AWS IoT custom endpoint")
parser.add_argument("-r", "--rootCA", action="store", required=True, dest="rootCAPath", help="Root CA file path")
parser.add_argument("-c", "--cert", action="store", dest="certificatePath", help="Certificate file path")
parser.add_argument("-k", "--key", action="store", dest="privateKeyPath", help="Private key file path")
parser.add_argument("-w", "--websocket", action="store_true", dest="useWebsocket", default=False,
                    help="Use MQTT over WebSocket")
parser.add_argument("-id", "--clientId", action="store", dest="clientId", default="basicPubSub",
                    help="Targeted client id")
args = parser.parse_args()
host = args.host
rootCAPath = args.rootCAPath
certificatePath = args.certificatePath
privateKeyPath = args.privateKeyPath
useWebsocket = args.useWebsocket
clientId = args.clientId
motionTopic = "sensor/motion/payload"
ledTopic = "sensor/led/payload"

if args.useWebsocket and args.certificatePath and args.privateKeyPath:
    parser.error("X.509 cert authentication and WebSocket are mutual exclusive. Please pick one.")
    exit(2)

if not args.useWebsocket and (not args.certificatePath or not args.privateKeyPath):
    parser.error("Missing credentials for authentication.")
    exit(2)

# Configure logging
logger = logging.getLogger("AWSIoTPythonSDK.core")
logger.setLevel(logging.DEBUG)
streamHandler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
streamHandler.setFormatter(formatter)
logger.addHandler(streamHandler)

# Init LED
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(18,GPIO.OUT)

# Init Motion Sensor
pir = MotionSensor(4)

# Init Camera
camera = PiCamera()

# Init S3
s3Resource = boto3.resource('s3')
s3Client = boto3.client('s3')

# Init AWSIoTMQTTClient
myAWSIoTMQTTClient = None
if useWebsocket:
    myAWSIoTMQTTClient = AWSIoTMQTTClient(clientId, useWebsocket=True)
    myAWSIoTMQTTClient.configureEndpoint(host, 443)
    myAWSIoTMQTTClient.configureCredentials(rootCAPath)
else:
    myAWSIoTMQTTClient = AWSIoTMQTTClient(clientId)
    myAWSIoTMQTTClient.configureEndpoint(host, 8883)
    myAWSIoTMQTTClient.configureCredentials(rootCAPath, privateKeyPath, certificatePath)

# AWSIoTMQTTClient connection configuration
myAWSIoTMQTTClient.configureAutoReconnectBackoffTime(1, 32, 20)
myAWSIoTMQTTClient.configureOfflinePublishQueueing(-1)  # Infinite offline Publish queueing
myAWSIoTMQTTClient.configureDrainingFrequency(2)  # Draining: 2 Hz
myAWSIoTMQTTClient.configureConnectDisconnectTimeout(10)  # 10 sec
myAWSIoTMQTTClient.configureMQTTOperationTimeout(5)  # 5 sec

# Connect and subscribe to AWS IoT
myAWSIoTMQTTClient.connect()
myAWSIoTMQTTClient.subscribe(motionTopic, 1, motionCallback)
myAWSIoTMQTTClient.subscribe(ledTopic, 1, ledCallback)
time.sleep(2)

# Constantly check for motion, and no motion and publish 
while True:
    pir.wait_for_motion()
    motionMessage = getBaseMessage()
    motionMessage["status"] = '1'
    myAWSIoTMQTTClient.publishAsync(motionTopic, json.dumps(motionMessage), 1)
    
    pir.wait_for_no_motion()
    noMotionMessage = getBaseMessage()
    noMotionMessage["status"] = '0'
    myAWSIoTMQTTClient.publishAsync(motionTopic, json.dumps(noMotionMessage), 1)
