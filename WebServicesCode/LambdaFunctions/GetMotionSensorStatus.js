'use strict';
console.log('Loading function');
let doc = require('dynamodb-doc');
let dynamo = new doc.DynamoDB();
let sensorTimeTable = "SensorTable";
let sensorCurrTable = "SensorCurrTable";

exports.handler = (event, context, callback) => {
   console.log('Received event:', JSON.stringify(event, null, 2));
   // Is a sensorId passed? if yes, query on data in time series table for that sensor.
   // If not, scan the sensor current status table
   if (event.sensorId) {
       // Default time range if not provided (last 5 mins)
       let timeEnd = new Date().getTime();
       let timeStart = timeEnd - (300 * 1000);

       // Use timeStart and timeEnd if provided
       if (event.timeStart) {
           timeStart = event.timeStart;
       }
       if (event.timeEnd && event.timeEnd > timeStart) {
           timeEnd = event.timeEnd;
       }
       
       let params = {
           TableName: sensorTimeTable,
           KeyConditionExpression: 'sensorId = :hkey and payloadTimestamp between :timestart and :timeend',
           ExpressionAttributeValues: {
               ':hkey': event.sensorId,
               ':timestart': timeStart.toString(),
               ':timeend': timeEnd.toString()
           },
       };
       dynamo.query(params, function(err, data) {
           if (err) {
               console.log(err, err.stack);
               callback(null, {});
           }
           else  {   
               console.log(data);
               callback(null, data);
           }
       });
    }
    else {
        let params = {
            TableName: sensorCurrTable,
        };
        dynamo.scan(params, function(err, data) {
        if (err) {console.log(err, err.stack); // an error occurred
            callback(null, {});
        }
        else  {   
            console.log(data);           // successful response
            callback(null, data);
        }
    });
}
};
