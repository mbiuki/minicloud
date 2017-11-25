var motionChart;
var ledChart;

window.onload = function() {
	setupMotionData();
	setupLedData();
}

function setupMotionData() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", "https://3v5mhdfdne.execute-api.us-west-2.amazonaws.com/prod/status/motion?timestart=0");

	xhttp.onload = function(e) {
		var motionData = JSON.parse(xhttp.response)["Items"];
		console.log(motionData)

		var timeStamps = [];
		var data = [];

		for (var i = 0; i < motionData.length; i++) {
			timeStamps.push(motionData[i].payload["timeStampEpoch"]);
			data.push(motionData[i].payload["status"]);
		}

		console.log(timeStamps);
		console.log(data);

		var ctx = document.getElementById('motionChart').getContext('2d');
		motionChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: timeStamps,
				datasets: [{
					label: 'Motion Sensor Status',
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

function setupLedData() {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", "https://3v5mhdfdne.execute-api.us-west-2.amazonaws.com/prod/status/led?timestart=0");

	xhttp.onload = function(e) {
		var ledData = JSON.parse(xhttp.response)["Items"];
		console.log(ledData)

		var timeStamps = [];
		var data = [];

		for (var i = 0; i < ledData.length; i++) {
			timeStamps.push(ledData[i].payload["timeStampEpoch"]);
			data.push(ledData[i].payload["status"]);
		}

		console.log(timeStamps);
		console.log(data);

		var ctx = document.getElementById('ledChart').getContext('2d');
		ledChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: timeStamps,
				datasets: [{
					label: 'LED Status',
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

var status = 0;
// setInterval(function() {
// 	var dataLength = motionChart.data.datasets[0].data.length;
// 	motionChart.data.datasets[0].data[dataLength] = status++ % 2;
// 	motionChart.data.labels[dataLength] = new Date().getTime();
// 	motionChart.update();
// 	console.log(dataLength);
// }, 1000);