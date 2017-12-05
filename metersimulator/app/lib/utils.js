'use strict';

var Device = require('../models/device');
var devfunc = require('./devfunc');
var fs = require('fs');
var client = null;

var device;
var appliances = [], applon = [];
var pwr = 0;
var exists = false;
/*
*
* read the registered appliances for this house
* set them all to false (off)
*
*/
fs.readFile('./config/house.json', 'utf8', function (err, appl) {
    if (err) {
        console.log(err);
    }
    appliances = JSON.parse(appl)
});

function getExists(callback) {
    fs.readFile('./config/device.json', 'utf8', function (err, savedDevice) {
        if (err) {
            return callback(err);
        }
        else {
            if (savedDevice.length > 0 && savedDevice !== 'undefined') {
                // create model from file
                var jsonDevice = JSON.parse(savedDevice);
                device = new Device();
                device.hubcs = jsonDevice.hubcs;
                device.deviceId = jsonDevice.deviceId;
                device.cs = jsonDevice.cs;
                device.connType = jsonDevice.connType;
                device.fw_version = jsonDevice.fw_version;
                device.interval = jsonDevice.interval;
                device.location = jsonDevice.location;
                device.msgType = jsonDevice.msgType;
                
                return callback(null, device);
            }
            else {
                return callback(null, null)
            }
        }
    });
}

function getDevice() {
    return device;
}
function setDevice(dev) {
    device = dev;
}
function getClient() {
    return client;
}
function setClient(cli) {
    client = cli;
}

function initAppliances() {
    return appliances;
}

function resetHouse() {
    appliances = allOff;
    applon = [];
}

function getAppliances() {
    return appliances 
}

function setAppliances(appl) {
    fs.writeFile('./config/house.json', JSON.stringify(appl), function (err) {
        if (err)
            return err;
    });
}

function setTelemetryValues(values) {
    if (values.hasOwnProperty('interval'))
        device.interval = values.interval;
    if (values.hasOwnProperty('msgType'))
        device.msgType = values.msgType;
}

function persistDevice(device, callback) {
    if (device) {
        console.log('persisting device object')
        console.log(device)
        fs.writeFile('./config/device.json', JSON.stringify(device), function (err) {
            if (err)
                return callback(err);
            else
                return callback(null)
        });
    }
    else
        return callback(null)
}

function getConsumption() {
    pwr = 0;
    for (var i = 0; i < appliances.length; i++) {
        if (appliances[i].state) {
            pwr += Number(appliances[i].kwm);
            applon.push(appliances[i].name)
        }
    }
    var reading = { "pwr": pwr, "appls": applon };
    return reading;
}

module.exports.setTelemetryValues = setTelemetryValues;
module.exports.getConsumption = getConsumption;
module.exports.getAppliances = getAppliances;
module.exports.setAppliances = setAppliances;
module.exports.initAppliances = initAppliances;

module.exports.resetHouse = resetHouse;

module.exports.persistDevice = persistDevice;
module.exports.getExists = getExists;
module.exports.setDevice = setDevice;
module.exports.getDevice = getDevice;
module.exports.setClient = setClient;
module.exports.getClient = getClient;








