var mqttClient = require('./awsiot.js');

var ledChart = {};
var motionChart = {};
var lightChart = {};
var dataChart = {};
var ledStatus;
var ledPublishTime; 
var cameraPublishTime;
var endpoint = "https://3v5mhdfdne.execute-api.us-west-2.amazonaws.com/prod";

// Subscribe to topics
window.mqttClientConnectHandler = function() {
	console.log('connect');
	mqttClient.subscribe("sensor/camera/image");
	mqttClient.subscribe("sensor/led/payload");
	mqttClient.subscribe("sensor/motion/payload");
	mqttClient.subscribe("sensor/light/payload");
};

// Respond to subscribed topics when they are published to
window.mqttClientMessageHandler = function(topic, payload) {
	var message = 'message: ' + topic + ':' + payload.toString();
	console.log(message);
	var payloadObj = JSON.parse(payload);

	// If new camera image, display it
	if (topic == "sensor/camera/image") {
		// Calculate delay and display it
		var delay = Date.now() - cameraPublishTime;
		var cameraDelay = document.getElementById("cameraDelay");
		cameraDelay.innerHTML = delay + " ms";
		// Set the image src
		document.getElementById("cameraImage").src = payloadObj["url"];
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
		ledText.innerHTML = payloadObj["status"];
		ledUpdated.innerHTML = payloadObj["timeStampIso"];
	}
	if (topic == "sensor/motion/payload") {
		var dataLength = motionChart.chart.data.datasets[0].data.length;
		motionChart.chart.data.datasets[0].data[dataLength] = payloadObj["status"];
		motionChart.chart.data.labels[dataLength] = payloadObj["timeStampIso"];
		motionChart.chart.update();

		var motionText = document.getElementById("motionStatus");
		var motionUpdated = document.getElementById("motionUpdatedTime");
		motionText.innerHTML = payloadObj["status"];
		motionUpdated.innerHTML = payloadObj["timeStampIso"];
	}
	if (topic == "sensor/light/payload") {
		var dataLength = lightChart.chart.data.datasets[0].data.length;
		lightChart.chart.data.datasets[0].data[dataLength] = payloadObj["status"];
		lightChart.chart.data.labels[dataLength] = payloadObj["timeStampIso"];
		lightChart.chart.update();

		var lightText = document.getElementById("lightStatus");
		var lightUpdated = document.getElementById("lightUpdatedTime");
		lightText.innerHTML = payloadObj["status"];
		lightUpdated.innerHTML = payloadObj["timeStampIso"];
	}
};

mqttClient.on('connect', window.mqttClientConnectHandler);
mqttClient.on('message', window.mqttClientMessageHandler);

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
		var lightText = document.getElementById("lightStatus");

		var ledUpdated = document.getElementById("ledUpdatedTime");
		var motionUpdated = document.getElementById("motionUpdatedTime");
		var lightUpdated = document.getElementById("lightUpdatedTime");

		var timeStampIso = new Date().toISOString();

		// Create the graphs for the sensors
		for (var i = 0; i < sensorStatus.length; i++) {
			var status = sensorStatus[i].payload.status;
			var date = sensorStatus[i].payload.timeStampIso;
			if (sensorStatus[i].sensorId == "led") {
				ledText.innerHTML = status;
				ledUpdated.innerHTML = date;
				ledStatus = sensorStatus[i].payload.status;
				setLedButtonStatus(sensorStatus[i].payload.status);
				createChart("led", document.getElementById('ledChart').getContext('2d'), ledChart, [sensorStatus[i].payload.status], [timeStampIso]);
			}
			if (sensorStatus[i].sensorId == "motion") {
				motionText.innerHTML = status;
				motionUpdated.innerHTML = date;
				createChart("motion", document.getElementById('motionChart').getContext('2d'), motionChart, [sensorStatus[i].payload.status], [timeStampIso]);
			}
			if (sensorStatus[i].sensorId == "light") {
				lightText.innerHTML = status;
				lightUpdated.innerHTML = date;
				createChart("light", document.getElementById('lightChart').getContext('2d'), lightChart, [sensorStatus[i].payload.status], [timeStampIso]);
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
		console.log(data)

		var timeStamps = [];
		var data = [];

		for (var i = 0; i < responseData.length; i++) {
			timeStamps.push(responseData[i].payload["timeStampIso"]);
			data.push(responseData[i].payload["status"]);
		}

		console.log(timeStamps);
		console.log(data);

		if (!sensorChart.chart) {
			createChart(sensor, sensorCtx, sensorChart, data, timeStamps);
		} else {
			updateChart(sensor, sensorChart, data, timeStamps);
		}
	}

	xhttp.send();
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

// Display the current camera image 
function getCurrImage() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", endpoint + "/getpicture");

	xhttp.onload = function(e) {
		var cameraImage = document.getElementById("cameraImage");
		var src = JSON.parse(xhttp.response)["Items"][0]["payload"]["url"];
		cameraImage.src = src;
	}

	xhttp.send();
}

function updateChart(sensor, sensorChart, data, timeStamps) {
	sensorChart.chart.data.datasets[0].label = sensor + "Status";
	sensorChart.chart.data.datasets[0].data = data;
	sensorChart.chart.data.labels = timeStamps;
	sensorChart.chart.update();
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

window.onLedButtonClick = function() {
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

window.onCameraButtonClick = function() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("POST", endpoint + "/takepicture");

	xhttp.onload = function(e) {
		console.log(xhttp.response);
	}

	// Record time published to calculate delay later
	cameraPublishTime = Date.now();
	xhttp.send();
}

window.onGraphButtonClick = function() {
	var sensorSelect = document.getElementById("sensorSelect");
	var timeStart = document.getElementById("timeStart");
	var timeEnd = document.getElementById("timeEnd");

	if (parseInt(timeStart.value) > parseInt(timeEnd.value)) {
		alert("Time Start cannot be lower than Time End");
		return;
	}

	setupSensorData(sensorSelect.value, document.getElementById('dataChart').getContext('2d'), dataChart, timeStart.value, timeEnd.value);
}