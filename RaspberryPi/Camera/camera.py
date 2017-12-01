from picamera import PiCamera

camera = PiCamera()
camera.capture('selfie.png')
camera.close()