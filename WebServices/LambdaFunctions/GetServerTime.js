exports.handler = (event, context, callback) => {
    callback(null, 
        {
            statusCode: 200, 
            body: 
                {
                    "time": new Date().getTime(),
                }
        });
};