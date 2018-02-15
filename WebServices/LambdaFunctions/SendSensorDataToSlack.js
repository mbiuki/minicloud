const https = require('https');

exports.handler = (event, context, callback) => {
    var slackMsg = {};
    
    switch(event.sensorId) {
        case "led":
            if (event.status == "1") {
                slackMsg.text = "LED turned On";
            }
            else {
                slackMsg.text = "LED turned Off";
            }
            break;
        case "motion":
            if (event.status == "1") {
                slackMsg.text = "Motion Detected";
            }
            else {
                slackMsg.text = "Motion Gone";
            }
            break;
        case "temp":
            slackMsg.text = "Temperature is now " + event.temp + " Degrees Celsius. \nHumidity is now " + event.humidity + "%";
            break;
        case "camera":
            var isHuman = false;
        	var rekText = "";
        	for (var i = 0; i < event.labels.length; i++) {
        		isHuman |= event.labels[i]["Name"] == "Human";
        		rekText += "\n" + event.labels[i]["Name"] + ": " + event.labels[i]["Confidence"].toFixed(2);
        	}
        	var humanDetectedMessage = isHuman ? "Human detected" : "No human detected";
            slackMsg = {
        		"attachments": [{
        			"fallback": "New Camera Image",
        			"title": humanDetectedMessage,
        			"text": rekText,
        			"image_url": event.url,
        			"color": "#764FA5"
        		}],
        		"unfurl_links": true
	        };
	        break;
        default:
            slackMsg = event;
            break;
    }
    
    const requestBody = JSON.stringify(slackMsg);
    
    const options = {
        hostname: 'hooks.slack.com',
        path: process.env.SLACK_WEBHOOK,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': requestBody.length
        }
    };

    const req = https.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          // code to execute
        });
        res.on('end', () => {
          // code to execute      
        });
    });
    req.on('error', (e) => {
        callback(null, "Error has occured");
        console.log(e)
    });
    req.write(requestBody);
    req.end();
};