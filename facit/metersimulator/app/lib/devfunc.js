'use strict';
var utils = require('./utils');
var msg = '';

// azure sdk
var iothub = require('azure-iothub');
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Device;
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
    Device = utils.getDevice();
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
                    type: value
                }
            };
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
        case 'location':
            var patch = {
                tags: {
                    location: {
                        zipcode: value
                    }
                }
            };
            writeTag(patch);
            break;
        case 'fw_version':
            var patch = {
                tags: {
                    fw_version: {
                        version: value
                    }
                }
            };
            writeTag(patch);
            break;
    }
}

var writeTag = function (patch) {
    var registry = iothub.Registry.fromConnectionString(utils.getHubCS());
    registry.getTwin(Device.id, function (err, twin) {
        if (err) {
            console.error(err.constructor.name + ': ' + err.message);
        } else {
            twin.update(patch, function (err) {
                if (err)
                    console.log('could not update twin: ' + err);
                else
                    console.log('twin state reported');
            });
        }
    })
}

var writeProp = function (patch) {
    if (Device.client === null) { // if the device is not currently connected, open an MQTT connection
        openConn = true;
        var client = clientFromConnectionString(Device.cs);
        utils.setClient(client);
    }
    if (Device.connectionState != 'open') // if no connection open, create one and close after reporting property
        Device.client.open(function (err) {
            if (err) // MAJOR UPSET - CLEAN UP LATER -> Need to return error so the calling route can exit gracefully
                msg = 'could not open IotHub client';
            utils.setConnectionState('open');
        });

    Device.client.getTwin(function (err, twin) {
        if (err)  // ANOTHER MAJOR UPSET - CLEAN UP LATER -> Need to return error so the calling route can exit gracefully
            msg = 'could not get twin: ' + JSON.stringify(err);
        else {
            twin.properties.reported.update(patch, function (err) {
                /*
                if (err)
                    console.log('could not update twin: ' + err); // ANOTHER MAJOR UPSET - CLEAN UP LATER -> Need to return error so the calling route can exit gracefully
                else
                    console.log('twin state reported');
                    */
            });
        }
        // close the MQTT connection if opened just to update twin
        if (openConn === true) {
            Device.client.close(function (err) {
                if (!err) {
                    openConn = false;
                    utils.setClient(null);
                    utils.setConnectionState('closed');
                }
                // ELSE: ANOTHER MAJOR UPSET - CLEAN UP LATER -> Need to return error so the calling route can exit gracefully
            });
        }
    });
}

module.exports.onBlock = onBlock;
module.exports.onRelease = onRelease;
module.exports.updateTwin = updateTwin;