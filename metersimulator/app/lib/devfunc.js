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
    }
}



var writeProp = function (patch) {

    // STEP 7
    // WRITE COE HERE TO UPDATE THE REPORTED PROPERTIES
    // NOTE: YOU ALREADY HAVE AN MQTT CLIENT CONNECTED, USE THE OBJECT STORED IN THE MODEL

}

module.exports.onBlock = onBlock;
module.exports.onRelease = onRelease;
module.exports.updateTwin = updateTwin;