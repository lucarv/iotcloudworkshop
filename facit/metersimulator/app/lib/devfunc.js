'use strict';
var utils = require('./utils');
var msg = '';

// azure sdk
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Client = require('azure-iot-device').Client;

/*
register listeners to direct methods
*/
function initDM(client, callback) {
    client.onDeviceMethod('writeLine', onWriteLine);
    client.onDeviceMethod('block', onBlock);
    client.onDeviceMethod('release', onRelease);

    return callback(null)
}
var onWriteLine= function (request, response) {
    console.log(request.payload);
    response.send(200, 'Input was written to log.', function (err) {
        if (err) {
            console.error('An error ocurred when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.');
        }
    });
}

var onBlock = function (request, response) {
    // Respond the cloud app for the direct method
    response.send(200, 'Electricity supply is now blocked', function (err) {
        if (err) {
            console.error('An error occured when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.');
        }
    });

    // Report the block 
    updateTwin('blockTimeStamp', new Date().toISOString());

    var device = utils.getDevice();
    device.status = 'blocked';
};

var onRelease = function (request, response) {

    response.send(200, 'Electricity supply is now restored', function (err) {
        if (err) {
            console.error('An error occured when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.');
        }
    });

    utils.getDevice().status = 'active';
}

// twin properties
var updateTwin = function (property, value) {
    utils.getClient().getTwin(function (err, twin) {
        if (err)
            msg = 'could not get twin: ' + JSON.stringify(err);
        else {
            console.log(property, value)
            var patch = { [property]: value }
            twin.properties.reported.update(patch, function (err) {
                if (err)
                    console.log(err)
                else
                    console.log('updated: ' + JSON.stringify(patch));
                // for the moment just assume it will work
            });
        }
    });
}

module.exports.initDM = initDM;
module.exports.updateTwin = updateTwin;