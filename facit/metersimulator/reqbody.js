module.exports = function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (req.body.deviceId) {
        registry = iothub.Registry.fromConnectionString(hubcs);
        registry.create({ deviceId: req.body.deviceId }, function (err, deviceInfo, result) {
            deviceKey = deviceInfo.authentication.symmetricKey.primaryKey;
            context.res = {
                // status: 200, /* Defaults to 200 */
                body: "Howdy dowdy " + (deviceKey)
            };
        });
    }
    else {
                context.res = {
                    status: 400,
                    body: "Please pass a name on the query string or in the request body"
                };
            }
    context.done();
    };