'use strict';
var jsonfile = require('jsonfile')
var Device = require('../models/device');
var devfunc = require('./devfunc');
var house = require('./config/house.json');
var thisDevice = require('./config/device.json')

var request = require("request-json");
var regUri = 'https://luca-devreg.azurewebsites.net'

var client = null;

var device;
var appliances = [], applon = [];
var pwr = 0;
var exists = false;

function getExists(callback) {

    if (thisDevice !== null) {
        // create model from file
        device = new Device();
        device.deviceId = thisDevice.deviceId;
        device.cs = thisDevice.cs;
        return callback(null, device);
    }
    else {
        return callback(null, null)
    }
}

function regDevice(devId, custIdx, callback) {
    var client = request.createClient(regUri);
    var data = {
        "deviceId": devId,
        "customerId": custIdx
    };
    client.post('/', data, function (err, res, body) {
        return callback(null, res.body.deviceKey);
    });

}

function getDevice() {
    return device;
}

function setDevice(dev) {
    device = dev;
    persistDevice(dev, function (err) {
        if (err)
            console.log(err)
    });
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
    jsonfile.writeFile('./app/lib/config/house.json', appl, function (err) {
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

        jsonfile.writeFile('./app/lib/config/device.json', device, function (err) {
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
module.exports.regDevice = regDevice;

module.exports.setDevice = setDevice;
module.exports.setClient = setClient;
module.exports.getClient = getClient;


module.exports.getDevice = getDevice;






