'use strict';
var utils = require('./utils');
var msg = '';

// azure sdk
var iothub = require('azure-iothub');
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;
var device;
var openConn = false;

// direct methods
var onBlock = function (request, response) {
    var client = clientFromConnectionString(utils.getDevice().cs);
    // Respond the cloud app for the direct method
    response.send(200, 'Electricity supply is now blocked', function (err) {
        if (!err) {
            console.error('An error occured when sending a method response:\n' + err.toString());
        } else {
            console.log('Response to method \'' + request.methodName + '\' sent successfully.');
        }
    });

    // Report the block 
    var date = new Date();
    var patch = {
        iothubDM: {
            block: {
                lastBlock: date.toISOString(),
            }
        }
    };

    // Get device Twin
    client.getTwin(function (err, twin) {
        if (err) {
            console.error('could not get twin: ' + JSON.stringify(err));
        } else {
            console.log('twin acquired');
            twin.properties.reported.update(patch, function (err) {
                if (err) throw err;
                console.log('Device twin state reported')
            });
        }
    });

    // Block API for physical restart.
    console.log('Blocking!');
};

var onRelease = function (request, response) {
    // do something here
    console.log('releasing...')
}
// twin properties
var updateTwin = function (property, value) {
    switch (property) {
        case 'appl':
            var appArray = utils.getAppliances()
            var patch = {
                tags: {
                    appliances: {
                        applArray: ['a', 'b']
                    }
                }
            };
            writeTag(patch);
            break;
        case 'interval':
            var patch = {
                interval: {
                    ms: value
                }
            };
            writeProp(patch);
            break;
        case 'msgType':
            var patch = {
                telemetry: {
                    msgType: value
                }
            };
            console.log(patch)
            
            writeProp(patch);
            break;
        case 'connType':
            var patch = {
                connectivity: {
                    type: value
                }
            };
            writeProp(patch);
            break;
    }
}

var writeProp = function (patch) {
    utils.getClient().getTwin(function (err, twin) {
        if (err)  // ANOTHER MAJOR UPSET - CLEAN UP LATER -> Need to return error so the calling route can exit gracefully
            msg = 'could not get twin: ' + JSON.stringify(err);
        else {
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

module.exports.onBlock = onBlock;
module.exports.onRelease = onRelease;
module.exports.updateTwin = updateTwin;