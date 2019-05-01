####################################
# University of British Columbia
# IoT Lab
# Drone_IOT
# Jan - April 2019
# python main.py -e a1m4chwp2cojxk-ats.iot.us-west-2.amazonaws.com -r root-CA.crt -c droneiot.cert.pem -k droneiot.private.key -a https://5jrxbyh3hg.execute-api.us-west-2.amazonaws.com/dev -p mehdiubc123
#####################################
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
from random import randint
from threading import Thread
import logging
import datetime
import time
import argparse
import json
import RPi.GPIO as GPIO
import requests

### Import Library for barometer ####
import navio.ms5611
#####################################
### Import Library for GPS ####
import navio.ublox
#####################################

def publishBarometer(temp, pressure):
    data = {"temp": temp, "pressure": pressure}
    print(requests.put(url=apiUrl + "/UpdateBarometer", data=json.dumps(data),
                       headers={"authorizationToken": apiPass}).text)

def publishGPS(lat, long, alt):
    data = {"latitude": lat, "longitude": long, "altitude": alt}
    print(requests.put(url=apiUrl + "/UpdateGPS", data=json.dumps(data),
                       headers={"authorizationToken": apiPass}).text)

def emitBarometerReadings():
	while(True):
		time.sleep(0.1)
		baro.readPressure()
		time.sleep(0.1)
		baro.readTemperature()
		baro.calculatePressureAndTemperature()
		if (0 <= baro.TEMP <= 100) and (0<=baro.PRES):
			print "Temperature(C): %.6f" % (baro.TEMP), "Pressure(millibar): %.6f" % (baro.PRES)
			Thread(target=publishBarometer, args=(round(baro.TEMP,2), round(baro.PRES,2))).start()
		time.sleep(5)
		
def emitGPSReadings():
	ubl = navio.ublox.UBlox("spi:0.0", baudrate=5000000, timeout=2)
	#ubl.configure_poll_port()
	#ubl.configure_poll(navio.ublox.CLASS_CFG, navio.ublox.MSG_CFG_USB)
	#ubl.configure_port(port=navio.ublox.PORT_SERIAL1, inMask=1, outMask=0)
	#ubl.configure_port(port=navio.ublox.PORT_USB, inMask=1, outMask=1)
	#ubl.configure_port(port=navio.ublox.PORT_SERIAL2, inMask=1, outMask=0)
	#ubl.configure_poll_port()
	#ubl.configure_poll_port(navio.ublox.PORT_SERIAL1)
	#ubl.configure_poll_port(navio.ublox.PORT_SERIAL2)
	#ubl.configure_poll_port(navio.ublox.PORT_USB)
	#ubl.configure_solution_rate(rate_ms=2000)
	#ubl.set_preferred_dynamic_model(None)
	#ubl.set_preferred_usePPP(None)
	ubl.configure_message_rate(navio.ublox.CLASS_NAV, navio.ublox.MSG_NAV_POSLLH, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_NAV, navio.ublox.MSG_NAV_PVT, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_NAV, navio.ublox.MSG_NAV_STATUS, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_NAV, navio.ublox.MSG_NAV_SOL, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_NAV, navio.ublox.MSG_NAV_VELNED, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_NAV, navio.ublox.MSG_NAV_SVINFO, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_NAV, navio.ublox.MSG_NAV_VELECEF, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_NAV, navio.ublox.MSG_NAV_POSECEF, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_RXM, navio.ublox.MSG_RXM_RAW, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_RXM, navio.ublox.MSG_RXM_SFRB, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_RXM, navio.ublox.MSG_RXM_SVSI, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_RXM, navio.ublox.MSG_RXM_ALM, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_RXM, navio.ublox.MSG_RXM_EPH, 1)
	#ubl.configure_message_rate(navio.ublox.CLASS_NAV, navio.ublox.MSG_NAV_TIMEGPS, 5)
	#ubl.configure_message_rate(navio.ublox.CLASS_NAV, navio.ublox.MSG_NAV_CLOCK, 5)
	while True:
		msg = ubl.receive_message()
		if msg.name() == "NAV_POSLLH":
			outstr = str(msg).split(",")[1:]
			lat = outstr[0].split("=")
			lat = float(lat[1])/10000000
			print(str(lat))
			long = outstr[1].split("=")
			long = float(long[1])/10000000
			print(str(long))
			alt = outstr[2].split("=")
			alt = float(alt[1])/1000
			print(str(alt))
			Thread(target=publishGPS, args=(round(lat,4), round(long,4), round(alt,4))).start()
			time.sleep(10)
		


# ####################################
# # Read in command-line parameters ##
# ####################################
parser = argparse.ArgumentParser()
parser.add_argument("-e", "--endpoint", action="store", required=True, dest="host", help="Your AWS IoT custom endpoint")
parser.add_argument("-r", "--rootCA", action="store", required=True, dest="rootCAPath", help="Root CA file path")
parser.add_argument("-c", "--cert", action="store", dest="certificatePath", help="Certificate file path")
parser.add_argument("-k", "--key", action="store", dest="privateKeyPath", help="Private key file path")
parser.add_argument("-s", "--s3", action="store", dest="s3Bucket", help="S3 Bucket Name")
parser.add_argument("-w", "--websocket", action="store_true", dest="useWebsocket", default=False,
                    help="Use MQTT over WebSocket")
parser.add_argument("-id", "--clientId", action="store", dest="clientId", default="basicPubSub",
                    help="Targeted client id")
parser.add_argument("-a", "--api", action="store", dest="apiUrl", help="API Gateway Endpoint")
parser.add_argument("-p", "--password", action="store", dest="apiPass", help="API Gateway Password")


args = parser.parse_args()
host = args.host
rootCAPath = args.rootCAPath
certificatePath = args.certificatePath
privateKeyPath = args.privateKeyPath
useWebsocket = args.useWebsocket
clientId = args.clientId
s3Bucket = args.s3Bucket
apiUrl = args.apiUrl
apiPass = args.apiPass

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

#########################
# Init Barometer MS5611 #
#########################
baro = navio.ms5611.MS5611()
baro.initialize()


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


# ############################################
# ## Subscription and Callback assignments ###
# ## Connect and subscribe to AWS IoT ########
# ############################################
myAWSIoTMQTTClient.connect()
#myAWSIoTMQTTClient.subscribe(pressureTopic, 1, pressureCallback )
#myAWSIoTMQTTClient.subscribe(TemperatureTopic,    1, tempCallback )
#myAWSIoTMQTTClient.subscribe(cameraTopic, 1, cameraCallback )
#myAWSIoTMQTTClient.subscribe(GPSTopic, 1, gpsCallback )
time.sleep(2)

Thread(target=emitBarometerReadings).start()
Thread(target=emitGPSReadings).start()

