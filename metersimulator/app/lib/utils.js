'use strict';

var Device = require('../models/device');
var devfunc = require('./devfunc');
var fs = require('fs');

var device = getDeviceFromFile;
var applon = [];
var pwr = 0;
var exists = false;
getDeviceFromFile();

function getHubCS(cs) {
    return Device.hubcs;
}

function getDeviceFromFile() {
    fs.readFile('./config/device.json', 'utf8', function (err, savedDevice) {
        if (err) {
            exists = false;
        }
        else {
            if (savedDevice.length > 0) {
                console.log('restoring device')
                
                // create model from file
                var jsonDevice = JSON.parse(savedDevice);
                device = new Device(jsonDevice.hubcs, jsonDevice.id, jsonDevice.cs);
                device.key = jsonDevice.key;
                device.appliances = jsonDevice.appliances;
                device.connType = jsonDevice.connType;
                device.fw_version = jsonDevice.fw_version;
                device.interval = jsonDevice.interval;
                device.location = jsonDevice.location;
                exists = true;
            }
            else {
                console.log('initial registration')
                exists = false
            }
        }
    });
}

var getExists = function () {
    console.log(exists);
    return exists;
}

function setDevice(hubcs, id, cs) {
    device = new Device(hubcs, id, cs);
    var appl = [];

    // the code below should be elsewhere, in here due to laziness
    // reading the apliances list from file when starting
    fs.readFile('./config/appl.json', 'utf8', function (err, appl) {
        if (err) {
            return err;
        }
        if (appl !== '')
            var appliances = JSON.parse(appl);

        device.appliances = appliances;
    });
}

function setDeviceKey(key) {
    device.key = key;
}

function setClient(client) {
    device.client = client;
}

function setConnectionState(state) {
    device.connectionState = state;
}

function getDevice() {
    return device;
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

function persistDevice() {
    device.client = null;
    device.connectionState = null;
    fs.writeFile('./config/device.json', JSON.stringify(device), function (err) {
        if (err)
            return console.log(err);
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

module.exports.getHubCS = getHubCS;
module.exports.setDevice = setDevice;
module.exports.setDeviceKey = setDeviceKey;
module.exports.setClient = setClient;
module.exports.getDevice = getDevice;
module.exports.setConnectionState = setConnectionState;
module.exports.setTelemetryValues = setTelemetryValues;
module.exports.getConsumption = getConsumption;
module.exports.getAppliances = getAppliances;
module.exports.setAppliances = setAppliances;
module.exports.resetHouse = resetHouse;

module.exports.persistDevice = persistDevice;
module.exports.getExists = getExists;




