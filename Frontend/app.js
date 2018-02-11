var ledChart = {};
var motionChart = {};
var tempChart = {};
var dataChart = {};
var ledStatus;
var ledPublishTime;
var cameraPublishTime;
var endpoint = mqttClient.config.endpoint;
var slackWebhook = mqttClient.config.slackWebhook;
var password;

// Subscribe to topics
function mqttClientConnectHandler() {
	console.log(mqttClient)
	mqttClient.subscribe("sensor/camera/image");
	mqttClient.subscribe("sensor/led/payload");
	mqttClient.subscribe("sensor/motion/payload");
	mqttClient.subscribe("sensor/temp/payload");
};

// Respond to subscribed topics when they are published to
function mqttClientMessageHandler(topic, payload) {
	var message = 'message: ' + topic + ':' + payload.toString();
	console.log(message);
	var payloadObj = JSON.parse(payload);

	// If new camera image, display it
	if (topic == "sensor/camera/image") {
		// Calculate delay and display it
		var manual = payloadObj["manual"];
		if (manual) {
			var delay = Date.now() - cameraPublishTime;
			var cameraDelay = document.getElementById("cameraDelay");
			cameraDelay.innerHTML = delay + " ms";
		}

		// Set the image and corresponding text
		setImage(payloadObj);
	}

	// If sensor status changes, add to graph, and update current status
	if (topic == "sensor/led/payload") {
		// Update led status
		ledStatus = payloadObj["status"];

		// Calculate delay and display it
		var delay = Date.now() - ledPublishTime;
		var ledDelay = document.getElementById("ledDelay");
		ledDelay.innerHTML = delay + " ms";

		// Graph the new data point
		var dataLength = ledChart.chart.data.datasets[0].data.length;
		ledChart.chart.data.datasets[0].data[dataLength] = payloadObj["status"];
		ledChart.chart.data.labels[dataLength] = payloadObj["timeStampIso"];
		ledChart.chart.update();

		// Update text 
		setLedButtonStatus(payloadObj["status"]);
		var ledText = document.getElementById("ledStatus");
		var ledUpdated = document.getElementById("ledUpdatedTime");
		ledText.innerHTML = payloadObj["status"] == 1 ? "LED On" : "LED Off";
		ledUpdated.innerHTML = new Date(payloadObj["timeStampIso"]).toLocaleString();
	}
	if (topic == "sensor/motion/payload") {
		var dataLength = motionChart.chart.data.datasets[0].data.length;
		motionChart.chart.data.datasets[0].data[dataLength] = payloadObj["status"];
		motionChart.chart.data.labels[dataLength] = payloadObj["timeStampIso"];
		motionChart.chart.update();

		var motionText = document.getElementById("motionStatus");
		var motionUpdated = document.getElementById("motionUpdatedTime");
		motionText.innerHTML = payloadObj["status"] == 1 ? "Motion Detected" : "No Motion Detected";
		motionUpdated.innerHTML = new Date(payloadObj["timeStampIso"]).toLocaleString();
	}
	if (topic == "sensor/temp/payload") {
		var dataLength = tempChart.chart.data.datasets[0].data.length;
		tempChart.chart.data.datasets[0].data[dataLength] = payloadObj["temp"];
		tempChart.chart.data.datasets[1].data[dataLength] = payloadObj["humidity"];
		tempChart.chart.data.labels[dataLength] = new Date(payloadObj["timeStampIso"]).toLocaleString();
		tempChart.chart.update();

		var tempText = document.getElementById("tempStatus");
		var tempUpdated = document.getElementById("tempUpdatedTime");
		var humidityText = document.getElementById("humidityStatus");
		var humidityUpdated = document.getElementById("humidityUpdatedTime");

		tempText.innerHTML = payloadObj["temp"] + " C";
		tempUpdated.innerHTML = payloadObj["timeStampIso"];
		humidityText.innerHTML = payloadObj["humidity"] + "%";
		humidityUpdated.innerHTML = payloadObj["timeStampIso"];
	}
};

mqttClient.on('connect', mqttClientConnectHandler);
mqttClient.on('message', mqttClientMessageHandler);

window.onload = function() {
	setDefaultTimeRange();
	setupCurrSensorStatus();
	window.onGraphButtonClick();
	getCurrImage();
}

// Get current status of sensors. Display and set up the graphs.
function setupCurrSensorStatus() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", endpoint + "/currstatus");

	xhttp.onload = function(e) {
		if (this.status != 200) {
			console.error("Error getting current sensor status");
			return;
		}

		var sensorStatus = JSON.parse(xhttp.response)["Items"];

		var ledText = document.getElementById("ledStatus");
		var motionText = document.getElementById("motionStatus");
		var tempText = document.getElementById("tempStatus");
		var humidityText = document.getElementById("humidityStatus");

		var ledUpdated = document.getElementById("ledUpdatedTime");
		var motionUpdated = document.getElementById("motionUpdatedTime");
		var tempUpdated = document.getElementById("tempUpdatedTime");
		var humidityUpdated = document.getElementById("humidityUpdatedTime");

		var timeStampIso = new Date().toISOString();

		// Create the graphs for the sensors
		for (var i = 0; i < sensorStatus.length; i++) {
			var date = sensorStatus[i].payload.timeStampIso;
			date = new Date(date);
			date = date.toLocaleString();
			if (sensorStatus[i].sensorId == "led") {
				var status = sensorStatus[i].payload.status;
				status = status == 1 ? "LED On" : "LED Off";
				ledText.innerHTML = status;
				ledUpdated.innerHTML = date;
				ledStatus = sensorStatus[i].payload.status;
				setLedButtonStatus(sensorStatus[i].payload.status);
				createChart("led", document.getElementById('ledChart').getContext('2d'), ledChart, [], []);
			}
			if (sensorStatus[i].sensorId == "motion") {
				var status = sensorStatus[i].payload.status;
				status = status == 1 ? "Motion Detected" : "No Motion Detected";
				motionText.innerHTML = status;
				motionUpdated.innerHTML = date;
				createChart("motion", document.getElementById('motionChart').getContext('2d'), motionChart, [], []);
			}
			if (sensorStatus[i].sensorId == "temp") {
				var temp = sensorStatus[i].payload.temp;
				var humidity = sensorStatus[i].payload.humidity;
				tempText.innerHTML = temp + " C";
				tempUpdated.innerHTML = date;
				humidityText.innerHTML = humidity + "%";
				humidityUpdated.innerHTML = date;
				createTempHumidityChart(document.getElementById('tempChart').getContext('2d'), tempChart);
			}
		}
	}

	xhttp.send();
}

// Graph data for a given sensor and time range
function setupSensorData(sensor, sensorCtx, sensorChart, timeStart, timeEnd) {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", endpoint + "/status/" + sensor + "?timestart=" + timeStart + "&timeEnd=" + timeEnd);

	xhttp.onload = function(e) {
		if (this.status != 200) {
			console.error("Error getting sensor data");
			return;
		}

		var responseData = JSON.parse(xhttp.response)["Items"];
		console.log(responseData)

		var timeStamps = [];
		var data = [];

		for (var i = 0; i < responseData.length; i++) {
			var val = responseData[i].payload["status"];
			timeStamps.push(responseData[i].payload["timeStampIso"]);
			data.push(val);
		}

		console.log(timeStamps);
		console.log(data);

		if (sensorChart.chart) {
			sensorChart.chart.destroy();
		}

		createChart(sensor, sensorCtx, sensorChart, data, timeStamps);
	}

	xhttp.send();
}

// Graph data for temp/humidity in a given time range
function setupTempHumidityData(sensorCtx, sensorChart, timeStart, timeEnd) {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", endpoint + "/status/temp?timestart=" + timeStart + "&timeEnd=" + timeEnd);

	xhttp.onload = function(e) {
		if (this.status != 200) {
			console.error("Error getting sensor data");
			return;
		}

		var responseData = JSON.parse(xhttp.response)["Items"];
		console.log(responseData)

		var timeStamps = [];
		var tempData = [];
		var humidityData = [];

		for (var i = 0; i < responseData.length; i++) {
			if (!responseData[i].payload["temp"]) {
				continue;
			}
			timeStamps.push(responseData[i].payload["timeStampIso"]);
			tempData.push(responseData[i].payload["temp"]);
			humidityData.push(responseData[i].payload["humidity"]);
		}

		console.log(timeStamps);
		console.log(tempData);
		console.log(humidityData);

		if (sensorChart.chart) {
			sensorChart.chart.destroy();
		}

		createTempHumidityChart(sensorCtx, sensorChart, tempData, humidityData, timeStamps);
	}

	xhttp.send();
}

function sendImageToSlack(url, message, isHuman) {
	var xhttp = new XMLHttpRequest();
	xhttp.open("POST", slackWebhook);

	var humanDetectedMessage = isHuman ? "Human Detected" : "No Human Detected";
	if (isHuman) {
		message = "<!everyone> " + message;
	}

	var body = {
		"attachments": [{
			"fallback": "New Camera Image",
			"title": humanDetectedMessage,
			"text": message,
			"image_url": url,
			"color": "#764FA5"
		}],
		"unfurl_links": true
	}

	xhttp.onload = function(e) {}

	xhttp.send(JSON.stringify(body));
}

function createChart(sensor, sensorCtx, sensorChart, data, timeStamps) {
	sensorChart.chart = new Chart(sensorCtx, {
		type: 'line',
		data: {
			labels: timeStamps,
			datasets: [{
				label: sensor + " Status",
				data: data,
				steppedLine: true,
				backgroundColor: "rgba(153,255,51,0.4)"
			}]
		},
		options: {
			scales: {
				xAxes: [{
					type: 'time',
				}]
			}
		}
	});
}

function createTempHumidityChart(sensorCtx, sensorChart, tempData, humidityData, timeStamps) {
	sensorChart.chart = new Chart(sensorCtx, {
		type: 'line',
		data: {
			labels: timeStamps,
			datasets: [
			{
				label: "Temperature",
				data: tempData,
				backgroundColor: "rgba(153,255,51,0.4)"
			},
			{
				label: "Humidity",
				data: humidityData,
				backgroundColor: "rgba(75,133,200,0.4)"
			},
			]
		},
		options: {
			scales: {
				xAxes: [{
					type: 'time',
				}]
			}
		}
	});
}

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
		rekText += "\n" + labels[i]["Name"] + ": " + labels[i]["Confidence"];
	}
	rekLabels.innerText = rekText;

	humanDetected.innerText = isHuman ? "Human detected" : "No human detected";

	sendImageToSlack(src, rekText, isHuman);
}

function setLedButtonStatus(newStatus) {
	var ledButton = document.getElementById("ledButton");
	ledButton.innerHTML = newStatus == "1" ? "Turn LED Off" : "Turn LED On";
}

// Set default time range for graphing custom data
function setDefaultTimeRange() {
	var timeStart = document.getElementById("timeStart");
	var timeEnd = document.getElementById("timeEnd");

	var time = new Date().getTime();
	timeEnd.value = parseInt(time);
	timeStart.value = parseInt(time) - 1000 * 3600;
}

function onLedButtonClick() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("PUT", endpoint + "/setstatus/led");

	xhttp.onload = function(e) {
		console.log(xhttp.response);
	}

	var newStatus = ledStatus == "1" ? "0" : "1";

	// Record time published to calculate delay later
	ledPublishTime = Date.now();
	xhttp.send(JSON.stringify({ "status": newStatus }));
}

function onCameraButtonClick() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("POST", endpoint + "/takepicture");
	xhttp.setRequestHeader("authorizationToken", password);

	xhttp.onload = function(e) {
		console.log(xhttp.response);
	}

	// Record time published to calculate delay later
	cameraPublishTime = Date.now();
	xhttp.send();
}

function onGraphButtonClick() {
	var sensorSelect = document.getElementById("sensorSelect");
	var timeStart = document.getElementById("timeStart");
	var timeEnd = document.getElementById("timeEnd");

	if (parseInt(timeStart.value) > parseInt(timeEnd.value)) {
		alert("Time Start cannot be lower than Time End");
		return;
	}

	if (sensorSelect.value == "temp") {
		setupTempHumidityData(document.getElementById('dataChart').getContext('2d'), dataChart, timeStart.value, timeEnd.value);
	}
	else {
		setupSensorData(sensorSelect.value, document.getElementById('dataChart').getContext('2d'), dataChart, timeStart.value, timeEnd.value);
	}
}

function onPasswordSubmit() {
	var passwordText = document.getElementById("passwordText").value;

	var xhttp = new XMLHttpRequest();
	xhttp.open("post", endpoint + "/checkpassword");

	xhttp.onload = function(e) {
		var result = JSON.parse(xhttp.response);
		console.log(result);
		if (result["valid"]) {
			alert("Access granted");
			password = passwordText;
			document.getElementById("passwordDiv").style.display = 'none';
			document.getElementById("buttonDiv").style.display = 'block';

		}
	}

	xhttp.send(JSON.stringify({ "password": passwordText }));
}