var ledChart = {};
var motionChart = {};
var tempChart = {};
var ledStatus;
var endpoint = "https://3v5mhdfdne.execute-api.us-west-2.amazonaws.com/prod";

window.onload = function() {
	getCurrSensorStatus();
	setupSensorData("led", document.getElementById('ledChart').getContext('2d'), ledChart);
	setupSensorData("motion", document.getElementById('motionChart').getContext('2d'), motionChart);
	setupSensorData("temperature", document.getElementById('tempChart').getContext('2d'), tempChart);
}

function getCurrSensorStatus() {
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

		for(var i = 0; i < sensorStatus.length; i++) {
			var text = sensorStatus[i].payload.status + ". Updated on " + sensorStatus[i].payload.timeStampIso;
			if (sensorStatus[i].sensorId == "led") {
				ledText.innerHTML = text;
				ledStatus = sensorStatus[i].payload.status;
				setLedButtonStatus(sensorStatus[i].payload.status);
			}
			if (sensorStatus[i].sensorId == "motion"){
				motionText.innerHTML = text;
			}
			if (sensorStatus[i].sensorId == "temperature"){
				tempText.innerHTML = text;
			}
		}
	}

	xhttp.send();
}

function setupSensorData(sensor, sensorCtx, sensorChart) {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", endpoint + "/status/" + sensor + "?timestart=0");

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
			timeStamps.push(responseData[i].payload["timeStampEpoch"]);
			data.push(responseData[i].payload["status"]);
		}

		console.log(timeStamps);
		console.log(data);

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
						distribution: 'series'
					}]
				}
			}
		});
	}

	xhttp.send();
}

function setLedButtonStatus(newStatus) {
	var ledButton = document.getElementById("ledButton");
	ledButton.innerHTML = newStatus == "1" ? "Turn LED Off" : "Turn LED On";
}

function onLedButtonClick() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("PUT", endpoint + "/setstatus/led");

	xhttp.onload = function(e) {
		console.log(xhttp.response);
		setLedButtonStatus(ledStatus);
	}

	ledStatus = ledStatus == "1" ? "0" : "1";

	xhttp.send(JSON.stringify({"status": ledStatus}));
}

// var status = 0;
// setInterval(function() {
// 	var dataLength = tempChart.chart.data.datasets[0].data.length;
// 	tempChart.chart.data.datasets[0].data[dataLength] = Math.random() * 30;
// 	tempChart.chart.data.labels[dataLength] = new Date().getTime();
// 	tempChart.chart.update();
// 	console.log(dataLength);
// }, 1000);