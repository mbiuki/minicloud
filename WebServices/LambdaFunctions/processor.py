import cv2
import boto3
import tempfile
import os
import json
import re
import time
from base64 import b64encode

access_key = os.environ['ACCESS_KEY']
secret_key = os.environ['SECRET_KEY']


def process_frames():

    video_client = boto3.client('kinesis-video-media', 
                                endpoint_url='https://s-4010bf70.kinesisvideo.us-west-2.amazonaws.com', 
                                aws_access_key_id=access_key,
                                aws_secret_access_key=secret_key,
                                region_name='us-west-2')

    # Get the latest video from the kinesis stream
    stream = video_client.get_media(
        StreamARN='arn:aws:kinesisvideo:us-west-2:039002679543:stream/droneiot/1551834020121', StartSelector={'StartSelectorType': 'NOW'})

    # Read a few seconds
    streamingBody = stream["Payload"]
    datafeed = streamingBody.read(40000)

    # Store the grabbed video in a temporary file
    temp_file, filename = tempfile.mkstemp()
    os.write(temp_file, datafeed)
    os.close(temp_file)

    # Get a capture from the video and create a greyscale image
    capture = cv2.VideoCapture(filename)
    ret, frame = capture.read()
    grey = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Encode the capture to png format
    frame_image = cv2.imencode('.png', grey)[1]

    # Call rekognition API on the image
    client = boto3.client('rekognition', 'us-west-2')
    response = client.detect_labels(
        Image={'Bytes': frame_image.tobytes()}, MinConfidence=75)

    #response_str = json.dumps(response)

    # return {
    #    'statusCode': 200,
    #    'headers': { 'Content-Type': 'json' },
    #    'body': response_str
    # }

    # Draw the bounding boxes for the frame and re-encode the image
    rek_frame = bounding_box(response, frame)

    rek_frame_image = cv2.imencode('.png', rek_frame)[1]

    # Encode the image as a base64 string
    base64_bytes = b64encode(rek_frame_image.tobytes())
    base64_string = base64_bytes.decode()

    # TODO: Have to also return the labels with no instances
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'image/png'},
        'body': base64_string
    }


def bounding_box(response, frame):

    height, width = frame.shape[:2]

    for label in response["Labels"]:
        rekObject = label["Name"]

        # Check if there are any instances for the object
        for instance in label["Instances"]:

            box = instance["BoundingBox"]

            # Get bounding box location
            x1 = box["Left"]
            y1 = box["Top"]
            x2 = x1 + box["Width"]
            y2 = y1 + box["Height"]

            # Draw the bounding box on the frame
            cv2.rectangle(frame, (round(x1 * height), round(y1 * width)),
                          (round(x2 * height), round(y2 * width)), (0, 0, 255), 5)

            (textWidth, textHeight) = cv2.getTextSize(rekObject,
                                                      cv2.FONT_HERSHEY_SIMPLEX, fontScale=1, thickness=2)[0]

            text_offset_x = round(x1 * height)
            text_offset_y = round(y1 * width)

            box_coords = ((text_offset_x, text_offset_y), (text_offset_x +
                                                           textWidth - 2, text_offset_y - textHeight - 2))

            cv2.rectangle(
                frame, box_coords[0], box_coords[1], (0, 0, 255), cv2.FILLED)

            # Display the label of the object above the box
            cv2.putText(frame, rekObject, (text_offset_x, text_offset_y),
                        cv2.FONT_HERSHEY_SIMPLEX, fontScale=1, color=(255, 255, 255), thickness=2)

    return frame


def lambda_handler(event, context):
    return process_frames()
