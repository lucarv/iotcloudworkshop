'use strict';
var express = require('express'),
    router = express.Router();
var utils = require('../lib/utils');
var devfunc = require('../lib/devfunc');
var Device = require('../models/device'),
    device;

//middleware
var bodyParser = require('body-parser');
var request = require('request');
var registrarUri = 'https://luca-devreg.azurewebsites.net'

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

// azure sdk
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var client, Client = require('azure-iot-device').Client;
var desiredVersion = null;
var hubName, customerList, custIdx;

var deviceKey = '', deviceId = '';
var msg = '', c2dmsg = '';
var appliancesArray = [];

/*
* create model, populate with initial settings
*/
function initDevice(did, key) {
    device = new Device();

    device.deviceId = did;
    device.cs = 'HostName=' + hubName + ';DeviceId=' + did + ';SharedAccessKey=' + key;
    device.appliances = utils.getAppliances();
}

/*
* configure according to twin properties
*/
function configDevice(callback) {
    var expressFlag = true;
    client.getTwin(function (err, twin) { // check if he telemetry interval has ben set by the operator    
        if (err) {
            return callback(err);
        } else
            twin.on('properties.desired', function (desiredChange) {
                if (twin.properties.desired.$version !== desiredVersion) {
                    desiredVersion = twin.properties.desired.$version;

                    // stop telemetry and restart again with a new frequency
                    if (desiredChange.hasOwnProperty('telemetry')) {
                        device.telemetry = desiredChange.telemetry
                        if (device.messaging == 'on') {
                            device.messaging = 'change';
                        }
                    }
                }
                if (expressFlag) {
                    expressFlag = false;
                    return callback(null);
                }
            });
    })
}

/*
* configure according to twin properties
*/
module.exports = function (app) {
    app.use('/', router)
};

/*
* start device simulator app
* check if this device was previously registered
* - if false, get the list of available hubs from
*   device registration portal
*/
router.get('/', function (req, res, next) {
    utils.readFromConfig(function (err, dev) {
        if (!dev) {
            
            request(registrarUri, function (error, response, body) {
                customerList = JSON.parse(body).customerList;

                res.render('index', {
                    title: "smart meter simulator",
                    deviceId: 'not registered',
                    status: 'inactive',
                    customerList: customerList
                });
            });
        } else {
            device = dev
            res.render('status', {
                title: "smart meter simulator",
                deviceId: device.deviceId,
                status: 'inactive',
                tele: device.lastTelemetry,
                messaging: device.messaging,
                footer: 'SUCCESS: ' + deviceId + ' previously registered'

            });
        }
    });
});

/*
* register as a new device
* initialize model
*/
router.post('/', function (req, res, next) {
    custIdx = req.body.custIdx;
    hubName = customerList[req.body.custIdx] + '.azure-devices.net'
    var did = req.body.devID;
    utils.registrar('create', did, custIdx, function (err, devKey) {
        if (err)
            res.render('error', { error: err });
        else {
            initDevice(did, devKey);
            utils.setDevice(device);
            res.render('status', {
                title: "smart meter simulator",
                deviceId: did,
                status: 'inactive',
                tele: device.lastTelemetry,
                messaging: device.messaging,
                footer: 'SUCCESS: ' + deviceId + ' registered with IoT Hub'
            });
        }
    });
});

/*
* check device status (inactive, active, blocked)
* telemetry details
*/
router.get('/status', function (req, res, next) {
    res.render('status', {
        title: "smart meter simulator",
        deviceId: device.deviceId,
        tele: device.lastTelemetry,
        messaging: device.messaging,
        status: device.status
    });
})

router.post('/status', function (req, res, next) {
    switch (req.body.action) {
        case 'toggle':
            if (device.status == 'active') {
                device.status = 'inactive';
                res.render('status', {
                    title: "smart meter simulator",
                    deviceId: device.deviceId,
                    status: device.status,
                    tele: device.lastTelemetry,
                    messaging: device.messaging,
                    footer: 'MQTT session created'
                });
            } else {
                // OPEN CLIENT CONNECTION
                client = clientFromConnectionString(device.cs);
                utils.setClient(client);
                client.open(function (err) {
                    if (err) { //something really fishy, report and leave the flow
                        res.render('error', { error: err });
                    } else {
                        device.status = 'active';
                        configDevice(function (err) {
                            if (err) { //something really fishy, report and leave the flow
                                res.render('error', { error: err });
                            } res.render('status', {
                                title: "smart meter simulator",
                                deviceId: device.deviceId,
                                status: device.status,
                                tele: device.lastTelemetry,
                                messaging: device.messaging,
                                footer: 'MQTT session created'
                            });
                        });

                    };
                });
            }

            //listener for direct messages
            client.on('message', function (msg) {
                c2dmsg = msg;
                client.complete(msg, function (err) {
                    if (err)
                        res.render('error', { error: err });
                });
            });

            // register listeners to direct methods
            devfunc.initDM(client, function (err) {
                if (err)
                    errorFlag = true;
            });
            break;

        case 'delete':

            utils.registrar('delete', device.deviceId, custIdx, function (err) {
                if (err) {
                    res.render('status', {
                        deviceId: device.deviceId,
                        status: device.status,
                        tele: device.lastTelemetry,
                        messaging: device.messaging,
                        footer: 'FAILURE: ' + deviceId + ' not found'
                    });
                }
                else {
                    device = null;
                    utils.persistDevice(device, function (err) {
                        if (err)
                            res.render('error', { error: err });
                        else
                            res.render('status', {
                                title: "smart meter simulator",
                                deviceId: 'null',
                                status: 'deleted',
                                tele: 'null',
                                messaging: 'null',
                                footer: 'SUCCESS: ' + deviceId + ' removed from IoT Hub registry'
                            });
                    });
                }
            });
            break;
    }
});

router.get('/c2d', function (req, res, next) {
    if (c2dmsg === '')
        msg = 'no c2d received'
    else
        msg = c2dmsg.data.toString()

    res.render('c2d', {
        title: "smart meter simulator",
        deviceId: deviceId,
        id: c2dmsg.messageId,
        data: msg
    });
})






