'use strict';
var jsonfile = require('jsonfile')
var Device = require('../models/device');
var devfunc = require('./devfunc');
var house = require('./config/house.json');
var thisDevice = require('./config/device.json')

var request = require("request-json");
var registrarUri = 'https://luca-devreg.azurewebsites.net'


var client = null;

var device;
var applon = [];
var pwr = 0;
var exists = false;

function readFromConfig(callback) {

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

function registrar(action, devId, custIdx, callback) {
    var client = request.createClient(registrarUri);
    var data = {
        "deviceId": devId,
        "customerId": custIdx
    };

    switch (action) {
        case 'create':
            client.put('/', data, function (err, res, body) {
                if (res.statusCode == 200)
                    return callback(null, res.body.deviceKey);
                else
                    return calback(res.body.error)
            });
            break;
        case 'delete':
            var uri = '/' + 'idx/0' + '/device/' + devId;
            client.delete(uri, data, function (err, res, body) {
                if (err)
                    return callback(err);
                else {
                    if (res.statusCode == 200)
                        return callback(null);
                    else
                        return callback(res.body)
                }
            });
            break;
    };
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

function resetHouse() {
    appliances = allOff;
    applon = [];
}

function getAppliances() {
    return house
}

function setAppliances(appl) {
    jsonfile.writeFile('./app/lib/config/house.json', appl, function (err) {
        if (err)
            return err;
    });
}

function persistDevice(device, callback) {
    jsonfile.writeFile('./app/lib/config/device.json', device, function (err) {
        if (err)
            return callback(err);
        else
            return callback(null)
    });

}

function getConsumption() {
    pwr = 0;
    for (var i = 0; i < house.length; i++) {
        if (house[i].state) {
            pwr += Number(house[i].kwm);
            applon.push(house[i].name)
        }
    }
    var variance = Math.random() * 2 - 1
    var reading = { "pwr": pwr + variance, "appls": applon };
    return reading;
}

module.exports.getConsumption = getConsumption;
module.exports.getAppliances = getAppliances;
module.exports.setAppliances = setAppliances;
module.exports.resetHouse = resetHouse;

module.exports.registrar = registrar;
module.exports.persistDevice = persistDevice;
module.exports.readFromConfig = readFromConfig;
module.exports.getDevice = getDevice;
module.exports.setDevice = setDevice;

module.exports.setClient = setClient;
module.exports.getClient = getClient;








