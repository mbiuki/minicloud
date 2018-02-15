'use strict';
console.log('Loading function');

function returnResult(callback, statusCode, body) {
	callback(null, {
		statusCode: statusCode,
		headers: {
			"Access-Control-Allow-Origin": "*"
		},
		body: JSON.stringify(body)
	});
}

exports.handler = (event, context, callback) => {
    var token = null;
    if (event.password) {
        token = event.password;
    }
	if (event.body) {
	    let body = JSON.parse(event.body);
	    if (body.password) {
		    token = body.password;
	    }
	}
    if (token == null) {
        returnResult(callback, 400, "Missing password");
    }
    
    var result = {};
    if (token.toLowerCase() == process.env.PASSWORD) {
        result["valid"] = true;
    }
    else{
        result["valid"] = false;
    }
    returnResult(callback, 200, result);
};