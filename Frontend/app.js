var tempChart = {};
var pressureChart = {};
var dataChart = {};
var latChart = {};
var longChart = {};
var altChart = {};
var endpoint = mqttClient.config.endpoint;
var password;
var timeStartPicker;
var timeEndPicker;
var defaultStartTimeDelta = 1000 * 3600 * 24;

// Subscribe to topics
function mqttClientConnectHandler() {
	mqttClient.subscribe("sensor/gps/payload");
	mqttClient.subscribe("sensor/barometer/payload");
};

// Respond to subscribed topics when they are published to
function mqttClientMessageHandler(topic, payload) {
	var message = 'message: ' + topic + ':' + payload.toString();
	console.log(message);
	var payloadObj = JSON.parse(payload);
	var date = new Date(payloadObj["timeStampIso"]).toLocaleString();

	// Temperature and Pressure data are emitted together
	if (topic == "sensor/barometer/payload") {
		var dataLength = tempChart.chart.data.datasets[0].data.length;
		tempChart.chart.data.datasets[0].data[dataLength] = payloadObj["temp"];
		pressureChart.chart.data.datasets[0].data[dataLength] = payloadObj["pressure"];
		tempChart.chart.data.labels[dataLength] = date;
		pressureChart.chart.data.labels[dataLength] = date;
		tempChart.chart.update();
		pressureChart.chart.update();

		var tempText = document.getElementById("tempStatus");
		var tempUpdated = document.getElementById("tempUpdatedTime");
		var pressureText = document.getElementById("pressureStatus");
		var pressureUpdated = document.getElementById("pressureUpdatedTime");

		tempText.innerHTML = payloadObj["temp"] + " \xB0C";
		tempUpdated.innerHTML = date;
		pressureText.innerHTML = payloadObj["pressure"] + " millibar";
		pressureUpdated.innerHTML = date;
	}
	// Latitude, Longitude and Altitude Data are emitted together
	if (topic == "sensor/gps/payload") {
		var dataLength = latChart.chart.data.datasets[0].data.length;
		latChart.chart.data.datasets[0].data[dataLength] = payloadObj["latitude"];
		latChart.chart.data.labels[dataLength] = date;
		longChart.chart.data.datasets[0].data[dataLength] = payloadObj["longitude"];
		longChart.chart.data.labels[dataLength] = date;
		altChart.chart.data.datasets[0].data[dataLength] = payloadObj["altitude"];
		altChart.chart.data.labels[dataLength] = date;
		latChart.chart.update();
		longChart.chart.update();
		altChart.chart.update();

		var latText = document.getElementById("latitudeStatus");
		var latUpdated = document.getElementById("latitudeUpdatedTime");
		var longText = document.getElementById("longitudeStatus");
		var longUpdated = document.getElementById("longitudeUpdatedTime");
		var altText = document.getElementById("altitudeStatus");
		var altUpdated = document.getElementById("altitudeUpdatedTime");


		latText.innerHTML = payloadObj["latitude"] + " \xB0";
		latUpdated.innerHTML = date;
		longText.innerHTML = payloadObj["longitude"] + " \xB0";
		longUpdated.innerHTML = date;
		altText.innerHTML = payloadObj["altitude"] + " m";
		altUpdated.innerHTML = date;
	}
};

mqttClient.on('connect', mqttClientConnectHandler);
mqttClient.on('message', mqttClientMessageHandler);

window.onload = function () {
	setupCurrSensorStatus();
	timeStartPicker = flatpickr("#timeStartPicker", {
		enableTime: true,
		dateFormat: "Y-m-d H:i",
		defaultDate: (new Date().getTime()) - defaultStartTimeDelta,
	});
	timeEndPicker = flatpickr("#timeEndPicker", {
		enableTime: true,
		dateFormat: "Y-m-d H:i",
		defaultDate: new Date(),
	});
	plotCustomGraph();
	//var isSignedIn = gapi.auth2.getAuthInstance().isSignedIn.get();
	//showSignInPrompt(!isSignedIn)
}

// Get current status of sensors. Display and set up the graphs.
function setupCurrSensorStatus() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", endpoint + "/GetSensorCurrStatus");

	xhttp.onload = function (e) {
		if (this.status != 200) {
			console.error("Error getting current sensor status");
			return;
		}

		var sensorStatus = JSON.parse(xhttp.response)["Items"];

		var tempText = document.getElementById("tempStatus");
		var pressureText = document.getElementById("pressureStatus");
		var tempUpdated = document.getElementById("tempUpdatedTime");
		var pressureUpdated = document.getElementById("pressureUpdatedTime");
		var latText = document.getElementById("latitudeStatus");
		var latUpdated = document.getElementById("latitudeUpdatedTime");
		var longText = document.getElementById("longitudeStatus");
		var longUpdated = document.getElementById("longitudeUpdatedTime");
		var altText = document.getElementById("altitudeStatus");
		var altUpdated = document.getElementById("altitudeUpdatedTime");

		var timeStart = (new Date().getTime()) - defaultStartTimeDelta;

		// Create the graphs for the sensors
		for (var i = 0; i < sensorStatus.length; i++) {
			var date = new Date(sensorStatus[i].payload.timeStampIso).toLocaleString();
			// Temperature and humidity data are emitted together
			if (sensorStatus[i].sensorId == "barometer") {
				var temp = sensorStatus[i].payload.temp;
				var pressure = sensorStatus[i].payload.pressure;
				tempText.innerHTML = temp + " \xB0C";
				tempUpdated.innerHTML = date;
				pressureText.innerHTML = pressure + " millibar";
				pressureUpdated.innerHTML = date;
				setupSensorData("temp", document.getElementById('tempChart').getContext('2d'), tempChart, timeStart, null, true);
				setupSensorData("pressure", document.getElementById('pressureChart').getContext('2d'), pressureChart, timeStart, null, true);
			}
			if (sensorStatus[i].sensorId == "gps") {
				var latitude = sensorStatus[i].payload.latitude;
				var longitude = sensorStatus[i].payload.longitude;
				var altitude = sensorStatus[i].payload.altitude;
				tempText.innerHTML = temp + " \xB0C";
				tempUpdated.innerHTML = date;
				pressureText.innerHTML = pressure + " millibar";
				pressureUpdated.innerHTML = date;
				latText.innerHTML = latitude + " \xB0";
				latUpdated.innerHTML = date;
				longText.innerHTML = longitude + " \xB0";
				longUpdated.innerHTML = date;
				altText.innerHTML = altitude + " m";
				altUpdated.innerHTML = date;

				setupSensorData("latitude", document.getElementById('latChart').getContext('2d'), latChart, timeStart, null, true);
				setupSensorData("longitude", document.getElementById('longChart').getContext('2d'), longChart, timeStart, null, true);
				setupSensorData("altitude", document.getElementById('altChart').getContext('2d'), altChart, timeStart, null, true);
			}
		}
	}

	xhttp.send();
}

// Graph data for a given sensor and time range
function setupSensorData(sensor, sensorCtx, sensorChart, timeStart, timeEnd, steppedLine, timeUnit) {
	var querySensor = sensor;
	if (sensor == "pressure" || sensor == "temp") {
		querySensor = "barometer";
	}
	if (sensor == "latitude" || sensor == "longitude" || sensor == "altitude") {
		querySensor = "gps";
	}
	var xhttp = new XMLHttpRequest();
	reqUrl = endpoint + "/GetDroneSensorStatus/" + querySensor + "?timestart=" + timeStart
	if (timeEnd) {
		reqUrl += "&timeEnd=" + timeEnd
	}
	xhttp.open("GET", reqUrl);

	xhttp.onload = function (e) {
		if (this.status != 200) {
			console.error("Error getting sensor data");
			return;
		}

		var responseData = JSON.parse(xhttp.response)["Items"];
		console.log(responseData)

		var timeStamps = [];
		var data = [];

		for (var i = 0; i < responseData.length; i++) {
			timeStamps.push(new Date(responseData[i].payload["timeStampIso"]).toLocaleString());
			var val;
			if (sensor == "temp") {
				val = responseData[i].payload["temp"];
			} else if (sensor == "pressure") {
				val = responseData[i].payload["pressure"];
			} else if (sensor == "latitude") {
				val = responseData[i].payload["latitude"];
			} else if (sensor == "longitude") {
				val = responseData[i].payload["longitude"];
			} else if (sensor == "altitude") {
				val = responseData[i].payload["altitude"];
			} else {
				val = responseData[i].payload["status"];
			}
			data.push(val);
		}

		console.log(timeStamps);
		console.log(data);

		if (sensorChart.chart) {
			sensorChart.chart.destroy();
		}

		// createChart(sensor, sensorCtx, sensorChart, data, timeStamps, steppedLine);
		if (sensor == "temp" || sensor == "pressure" || sensor == "longitude" || sensor == "latitude" || sensor == "altitude") {
			createChart(sensor, sensorCtx, sensorChart, data, timeStamps, steppedLine, timeUnit);
		} else {
			createStatusChart(sensor, sensorCtx, sensorChart, data, timeStamps, steppedLine);
		}
	}

	xhttp.send();
}

function createChart(sensor, sensorCtx, sensorChart, data, timeStamps, steppedLine, timeUnit) {

	//Choose y axis label based on sensor data
	var label;
	switch (sensor) {
		case "temp":
			label = '\xB0C'
			break;
		case "pressure":
			label = 'millibar'
			break;
		case "longitude":
			label = '\xB0'
			break;
		case "latitude":
			label = '\xB0'
			break;
		case "altitude":
			label = 'm (above sea level)'
			break;
		default:
			label = ' '
	}

	sensorChart.chart = new Chart(sensorCtx, {
		type: 'line',
		data: {
			labels: timeStamps,
			datasets: [{
				label: sensor + " status",
				data: data,
				steppedLine: steppedLine,
				backgroundColor: "rgba(153,255,51,0.4)"
			}]
		},
		options: {
			elements: {
				point: {
					radius: 0
				}
			},
			scales: {
				xAxes: [{
					display: true,
					type: 'time',
					time: {
						parser: 'DD/MM/YYYY HH:mm:ss',
						tooltipFormat: 'll HH:mm:ss',
						unit: timeUnit, //Use days when plotting custom chart
						displayFormats: {
							'day': 'DD/MM/YYYY'
						}
					}
				}],
				yAxes: [{
					ticks: {
						suggestedMin: 0
					},
					scaleLabel: {
						display: true,
						labelString: label,
						fontColor: "#546372"
					}
				}],
			}
		}
	});
}

function createStatusChart(sensor, sensorCtx, sensorChart, data, timeStamps, steppedLine) {
	sensorChart.chart = new Chart(sensorCtx, {
		type: 'line',
		data: {
			labels: timeStamps,
			datasets: [{
				label: sensor + " status",
				data: data,
				steppedLine: steppedLine,
				backgroundColor: "rgba(153,255,51,0.4)"
			}]
		},
		options: {
			scales: {
				xAxes: [{
					type: 'time',
				}],
				yAxes: [{
					ticks: {
						min: 0,
						max: 1,
						stepSize: 1,
						suggestedMin: 0,
						suggestedMax: 1,
						callback: function (label, index, labels) {
							switch (label) {
								case 0:
									return 'OFF';
								case 1:
									return 'ON';
							}
						}
					}
				}],
			}
		}
	});
}
/*
// Get the current camera image and display it
function getCurrImage() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", endpoint + "/getpicture");

	xhttp.onload = function(e) {
		var response = JSON.parse(xhttp.response)["Items"][0]["payload"];
		setImage(response);
	}

	xhttp.send();
}

// Uses the provided response from IoT and sets the camera image, labels, and human detected text accordingly
function setImage(response) {
	var cameraImage = document.getElementById("cameraImage");
	var rekLabels = document.getElementById("rekLabels");
	var imageDate = document.getElementById("imageDate");
	var humanDetected = document.getElementById("humanDetected");

	var src = response["url"];
	var labels = response["labels"];
	var imageDateText = response["timeStampIso"];

	cameraImage.src = src;
	imageDate.innerText = new Date(imageDateText).toLocaleString();

	var isHuman = false;
	var rekText = "";
	for (var i = 0; i < labels.length; i++) {
		isHuman |= labels[i]["Name"] == "Human";
		rekText += "\n" + labels[i]["Name"] + ": " + labels[i]["Confidence"].toFixed(2);
	}
	rekLabels.innerText = rekText;

	humanDetected.innerText = isHuman ? "Human detected" : "No human detected";
}

function setLedButtonStatus(newStatus) {
	var ledButton = document.getElementById("ledButton");
	ledButton.innerHTML = newStatus == "1" ? "Turn LED Off" : "Turn LED On";
}


function onLedButtonClick() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("PUT", endpoint + "/setstatus/led");
	var token = getGoogleToken();
	console.log(token);
	xhttp.setRequestHeader("authorizationToken", token);

	xhttp.onload = function(e) {
		console.log(xhttp.response);
	}

	xhttp.onerror = function(e) {
		alert("You can send commands again in 24 hours");
	}

	var newStatus = ledStatus == "1" ? "0" : "1";

	// Record time published to calculate delay later
	ledPublishTime = Date.now();
	xhttp.send(JSON.stringify({ "status": newStatus, "sender": token }));
}

function onCameraButtonClick() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("POST", endpoint + "/takepicture");
	var token = getGoogleToken();
	xhttp.setRequestHeader("authorizationToken", token);

	xhttp.onload = function(e) {
		console.log(xhttp.response);
	}

	xhttp.onerror = function(e) {
		alert("You can send commands again in 24 hours");
	}

	// Record time published to calculate delay later
	cameraPublishTime = Date.now();
	xhttp.send(JSON.stringify({ "sender": token }));
}
*/
function onGraphButtonClick() {
	plotCustomGraph();
}

function plotCustomGraph() {
	var sensorSelect = document.getElementById("sensorSelect");

	var timeStart = timeStartPicker.selectedDates[0].getTime();
	var timeEnd = timeEndPicker.selectedDates[0].getTime();

	if (timeStart > timeEnd) {
		alert("Time Start cannot be lower than Time End");
		return;
	}

	var steppedLine = false;
	setupSensorData(sensorSelect.value, document.getElementById('dataChart').getContext('2d'), dataChart, timeStart, timeEnd, steppedLine, 'day');
}

/*function onSignIn(googleUser) {
	// Useful data for your client-side scripts:
	var profile = googleUser.getBasicProfile();
	console.log("ID: " + profile.getId()); // Don't send this directly to your server!
	console.log('Full Name: ' + profile.getName());
	console.log('Given Name: ' + profile.getGivenName());
	console.log('Family Name: ' + profile.getFamilyName());
	console.log("Image URL: " + profile.getImageUrl());
	console.log("Email: " + profile.getEmail());

	// The ID token you need to pass to your backend:
	var id_token = googleUser.getAuthResponse().id_token;
	console.log("ID Token: " + id_token);

	showSignInPrompt(false);
};

function signOut() {
	var auth2 = gapi.auth2.getAuthInstance();
	auth2.signOut().then(function() {
		console.log('User signed out.');
	});

	showSignInPrompt(true);
}

function getGoogleToken() {
	return gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;
}

function showSignInPrompt(show) {
	if (show) {
		document.getElementById("signInText").style.display = 'block';
		document.getElementById("buttonDiv").style.display = 'none';
		document.getElementById("googleSignout").style.display = 'none';
	} else {
		document.getElementById("signInText").style.display = 'none';
		document.getElementById("buttonDiv").style.display = 'block';
		document.getElementById("googleSignout").style.display = 'block';
	}
}*/