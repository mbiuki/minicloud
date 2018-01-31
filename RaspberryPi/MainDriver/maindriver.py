####################################
# University of British Columbia
# IoT Lab
# Oct-Dec 2017
#####################################
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

# #######################################################
# Callback when motion sensor detects motion rising edge
# #######################################################
def motionCallback(client, userdata, message):
    print("Received a new message: ")
    print(message.payload)
    print("from topic: ")
    print(message.topic)
    payload = json.loads(message.payload)
    if payload["status"] == '1':
        takePicture(False)
        
    print("--------------\n\n")


# ###################################################
# Callback when website presses Take Picture button
# ###################################################
def cameraCallback(client, userdata, message):
    takePicture(True)


# ###################################################
# Take a picture. Upload to S3 and generate a URL.
# Send to Rekognition to see labels of images.
# Send the URL and labels in an IoT Publish
# manual param means whether an image was taken via 
# button press or motion sensor.
# ###################################################
def takePicture(manual):
    filename = datetime.datetime.now().isoformat() + ".jpg"
    imagePath = "../minicloud_images/" + filename
    camera.capture(imagePath)
    image = open(imagePath, "rb")
        
    # Upload camera image to S3, and grab the url
    s3Resource.Bucket(s3Bucket).put_object(Key=filename, Body=image)
    url = s3Client.generate_presigned_url('get_object',
                                Params={
                                    'Bucket': s3Bucket,
                                    'Key': filename
                                },
                                ExpiresIn = 3600 * 24 * 3
    )                                      
    print(url)
    
    response = rekClient.detect_labels(Image={'S3Object':{'Bucket':s3bucket,'Name':filename}},MinConfidence=40)
    print(response)
        
    # Send the image url in an IoT Publish
    myAWSIoTMQTTClient.publishAsync("sensor/camera/image",
        json.dumps({"url":url, "labels":response["Labels"], "manual": manual}), 1)


# ########################################
# Callback when website presses LED button
# ########################################
def ledCallback(client, userdata, message):
    print("Received a new message: ")
    print(message.payload)
    print("from topic: ")
    print(message.topic)
    payload = json.loads(message.payload)
    if payload["status"] == '1':
        print("LED ON")
        GPIO.output(20,GPIO.HIGH)
    else:
        print("LED OFF")
        GPIO.output(20,GPIO.LOW
                    )
    print("--------------\n\n")


# ##############################################
# For motion sensor, timestamp the time that 
# someone passes by the motion sensor
# ##############################################
def getBaseMessage():
    message = {}
    message["timeStampEpoch"] = int(time.time() * 1000)
    message["timeStampIso"] = datetime.datetime.now().isoformat()
    return message


# ####################################
# # Read in command-line parameters ##
# ####################################
parser = argparse.ArgumentParser()
parser.add_argument("-e", "--endpoint", action="store", required=True, dest="host", help="Your AWS IoT custom endpoint")
parser.add_argument("-r", "--rootCA", action="store", required=True, dest="rootCAPath", help="Root CA file path")
parser.add_argument("-c", "--cert", action="store", dest="certificatePath", help="Certificate file path")
parser.add_argument("-k", "--key", action="store", dest="privateKeyPath", help="Private key file path")
parser.add_argument("-s", "--s3", action="store", dest="s3bucket", help="S3 Bucket Name")
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
s3Bucket = args.s3bucket

if useWebsocket and certificatePath and privateKeyPath:
    parser.error("X.509 cert authentication and WebSocket are mutual exclusive. Please pick one.")
    exit(2)

if not useWebsocket and (not certificatePath or not privateKeyPath):
    parser.error("Missing credentials for authentication.")
    exit(2)


# ##################################
# ####### Configure logging ########
# ##################################
logger = logging.getLogger("AWSIoTPythonSDK.core")
logger.setLevel(logging.DEBUG)
streamHandler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
streamHandler.setFormatter(formatter)
logger.addHandler(streamHandler)

######################
# #### Init LED ######
######################
# on this RPi3 we have two leds connected
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(18,GPIO.OUT)
GPIO.setup(20,GPIO.OUT)

######################
# Init Motion Sensor #
######################
pir = MotionSensor(4)

######################
# ## Init Camera #####
######################
camera = PiCamera(resolution=(640, 480))

######################
# #### Init S3 #######
######################
s3Resource = boto3.resource('s3')
s3Client = boto3.client('s3')

# Init Rekognition
rekClient = boto3.client('rekognition')

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


# ##################################
# #### create some MQTT topics #####
# ##################################
motionTopic = "sensor/motion/payload"
ledTopic    = "sensor/led/payload"
cameraTopic = "sensor/camera/takepicture"
# #########################################


# ############################################
# ## Subscription and Callback assignments ###
# ## Connect and subscribe to AWS IoT ########
# ############################################
myAWSIoTMQTTClient.connect()
myAWSIoTMQTTClient.subscribe(motionTopic, 1, motionCallback )
myAWSIoTMQTTClient.subscribe(ledTopic,    1, ledCallback    )
myAWSIoTMQTTClient.subscribe(cameraTopic, 1, cameraCallback )
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

# EoF
