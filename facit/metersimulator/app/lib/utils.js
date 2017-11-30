'use strict';

var Device = require('../models/device');
var devfunc = require('./devfunc');
var fs = require('fs');

var device;
var applon = [];
var pwr = 0;
var exists = false;

function getHubCS(cs) {
    return Device.hubcs;
}

function getExists(callback) {
    fs.readFile('./config/device.json', 'utf8', function (err, savedDevice) {
        if (err) {
            return callback(err);
        }
        else {
            if (savedDevice.length > 0) {
                // create model from file
                var jsonDevice = JSON.parse(savedDevice);
                device = new Device();
                device.hubcs = jsonDevice.hubcs;
                device.deviceId = jsonDevice.deviceId;
                device.cs = jsonDevice.cs;
                device.appliances = jsonDevice.appliances;
                device.connType = jsonDevice.connType;
                device.fw_version = jsonDevice.fw_version;
                device.interval = jsonDevice.interval;
                device.location = jsonDevice.location;
                device.regStatus = "enabled";               
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
    
function setDevice(device, callback) {
    // the code below should be elsewhere, in here due to laziness
    // reading the apliances list from file when starting
    fs.readFile('./config/appl.json', 'utf8', function (err, appl) {
        if (err) {
            return callback(err);
        }
        if (appl !== '')
            return callback(null, JSON.parse(appl));
        else
            return callback(null, [])
    });
}

function resetHouse() {
    appliances = allOff;
    applon = [];
}

function getAppliances() {
    //return appliances  
    return device.appliances;
}

function setAppliances(appl) {
    device.appliances = appl;
    fs.writeFile('./config/appl.json', JSON.stringify(appl), function (err) {
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
    fs.writeFile('./config/device.json', JSON.stringify(device), function (err) {
        if (err)
            return callback(err);
        else
            return callback(null)
    });
}


function getConsumption() {
    pwr = 0;
    // resetHouse();

    for (var i = 0; i < device.appliances.length; i++) {
        if (device.appliances[i].state == 'on') {
            pwr += Number(device.appliances[i].kwm);
            //applon.push(device.appliances[i].name)
        }
    }

    var reading = { "pwr": pwr, "appls": applon };
    return reading;
}

module.exports.setTelemetryValues = setTelemetryValues;
module.exports.getConsumption = getConsumption;
module.exports.getAppliances = getAppliances;
module.exports.setAppliances = setAppliances;
module.exports.resetHouse = resetHouse;

module.exports.persistDevice = persistDevice;
module.exports.getExists = getExists;
module.exports.setDevice = setDevice;
module.exports.getDevice = getDevice;







