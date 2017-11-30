'use strict';
var express = require('express'),
    router = express.Router();
var utils = require('../lib/utils');
var devfunc = require('../lib/devfunc');

var Device = require('../models/device'),
    device;
var smtwin = require('./smtwin.js');

//middleware
var bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

// azure sdk
var iothub = require('azure-iothub');
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;
var desiredVersion = null;
var registry, client;

var deviceKey = '';
var deviceId = '';
var cs = '', devCS = '', hubName = '';
var msg = '',
    c2dmsg = 'no message reveived';

var myTimer,
    msgType = 'stream',
    interval = null,
    telemetry = false;

var lastMeterReading = 0;
var appliancesArray = [];

// auxiliary functions
// move this inline as anonymous functions
function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        var ts = new Date().toISOString();
        if (res) console.log(op + ' status: ' + res.constructor.name + ' > ' + ts);
    };
}

function initDevice(cs, did, key) {
    device.deviceId = did;
    device.hubName = cs.substring(cs.indexOf('=') + 1, cs.indexOf(';'));
    device.hubcs = cs;
    device.cs = 'HostName=' + device.hubName + ';DeviceId=' + did + ';SharedAccessKey=' + key;
}

function createSession(callback) {
    client = clientFromConnectionString(device.cs);
    client.open(function (err) {
        if (err) { //something really fishy, report and leave the flow
            callback(err);
        } else {
            // subscribed to property changes
            // ARCH NOTE: move this outside of this loop
            device.regStatus = 'enabled';
            device.client = client;
            client.getTwin(function (err, twin) { // check if he telemetry interval has ben set by the operator    
                if (err) {
                    callback(err);
                } else {
                    twin.on('properties.desired', function (desiredChange) {
                        if (twin.properties.desired.$version !== desiredVersion) {
                            desiredVersion = twin.properties.desired.$version;

                            // stop telemetry and restart again with a new frequency
                            if (desiredChange.hasOwnProperty('interval')) {
                                interval = twin.properties.desired.interval.ms
                                devfunc.updateTwin('interval', interval);
                            }
                            if (desiredChange.hasOwnProperty('telemetry')) {
                                msgType = twin.properties.desired.telemetry.type
                                devfunc.updateTwin('msgType', msgType);
                            }
                            if (telemetry) {
                                clearInterval(myTimer);
                                telemetry = false;
                                startTelemetry(Device.client);
                            }
                            // add code here to manage other desired properties
                            // such as desired FW version
                            // .......
                        }
                    });
                }
            });
            // ARCH NOTE: read last received message -> move this outside this loop
            client.on('message', function (msg) {
                c2dmsg = ('Id: ' + msg.messageId + ' Body: ' + msg.data);
                client.complete(msg, printResultFor('completed'));
            });
            callback(null);
        }
    });
}

var startTelemetry = function () {
    // NOTE -> uses a global var interval, maybe better to localized it
    // Create a message and send it to the IoT Hub at interval
    telemetry = true;
    myTimer = setInterval(function () {
        var reading = utils.getConsumption();
        console.log('reading: ' + reading.pwr)
        console.log('lastMeterReading: ' + lastMeterReading)
        var data = JSON.stringify({
            deviceId: device.deviceId,
            timestamp: Date.now(),
            consumption: reading.pwr,
            appliances: reading.appls
        });
        var message = new Message(data);

        //akert for high consumption
        if (reading.pwr > 100) {
            message.properties.add('usagealert', 'true');
        }

        if (device.msgType === 'delta') {
            if (reading.pwr != lastMeterReading) {
                client.sendEvent(message, printResultFor('send'));
            } else
                console.log('skip messaging as no changes');
        } else
            client.sendEvent(message, printResultFor('send'));

        lastMeterReading = reading.pwr;
    }, device.interval);
}


// ROUTING
module.exports = function (app) {
    app.use('/', router)
};

router.get('/', function (req, res, next) {
    utils.getExists(function (err, dev) {
        if (err)
            res.render('error', { error: err });
        else {
            if (!dev) {
                device = new Device();
                utils.setDevice(device, function (err, appl) {
                    if (err)
                        res.render('error', { error: err });
                    else {
                        device.appliances = appl;
                        res.render('index', {
                            title: "smart meter simulator",
                            deviceId: 'not registered',
                            status: 'false',
                            footer: 'NOTE: The IOT HUB connection string is available on the azure portal'
                        });
                    }
                })
            }
            else {
                device = dev;
                createSession(function (err) {
                    if (err)
                        res.render('error', { error: err });
                    else
                        res.render('status', {
                            title: "smart meter simulator",
                            deviceId: device.deviceId,
                            status: 'enabled',
                            footer: 'WARNING: ' + device.deviceId + ' already registered'
                        });
                });
            }
        }
    });
});

router.post('/', function (req, res, next) {
    switch (req.body.action) {
        case 'register':
            var hubcs = req.body.cs;
            var did = req.body.devID;

            registry = iothub.Registry.fromConnectionString(hubcs);
            registry.create({ deviceId: did }, function (err, deviceInfo, result) {
                if (err) { // error registering to hub
                    registry.get(did, function (err, deviceInfo, res) {
                        if (deviceInfo) {
                            deviceKey = deviceInfo.authentication.symmetricKey.primaryKey;
                            initDevice(hubcs, did, deviceKey);
                        }
                        else // something really wrong happened, break the flow and show the error
                            res.render('error', { error: err });
                    });
                    res.render('index', {
                        title: "smart meter simulator",
                        deviceId: did,
                        footer: "ERROR: " + err.message
                    });
                } else {
                    deviceKey = deviceInfo.authentication.symmetricKey.primaryKey;
                    initDevice(hubcs, did, deviceKey);

                    utils.persistDevice(device, function (err) {
                        if (err)
                            res.render('error', { error: err });
                        else {
                            createSession(function (err) {
                                if (err)
                                    res.render('error', { error: err });
                                else {
                                    msg = 'SUCCESS: ' + deviceId + ' registered with IoT Hub';
                                    res.render('status', {
                                        title: "smart meter simulator",
                                        deviceId: did,
                                        status: device.regStatus,
                                        footer: msg
                                    });

                                }
                            });
                        }
                    });
                }
            });
            break;

        case 'delete':
            //do something here
            break;
        default:
            console.log('cant get there form here');
    }
});

router.post('/status', function (req, res, next) {
    var registry = iothub.Registry.fromConnectionString(device.hubcs);
    var newStatus = 'enabled';
    if (device.regStatus === 'enabled')
        newStatus = 'disabled';

    registry.update({ deviceId: device.deviceId, status: newStatus }, function (err, deviceInfo, result) {
        if (err)
            res.render('error', { error: err });
        else {
            if (newStatus === 'enabled') {
                createSession(function () {
                    res.render('telemetry', {
                        title: "smart meter simulator",
                        deviceId: deviceId,
                        footer: 'device is enabled, start telemetry'
                    });
                });
            } else {
                res.render('status', {
                    title: "smart meter simulator",
                    deviceId: deviceId,
                    footer: 'status changed to: ' + newStatus
                });
            }

        }
    });
})

router.get('/c2d', function (req, res, next) {
    res.render('c2d', {
        title: "smart meter simulator",
        deviceId: deviceId,
        msg: c2dmsg
    });
})
router.get('/telemetry', function (req, res, next) {
    res.render('telemetry', {
        title: "smart meter simulator",
        interval: device.interval,
        deviceId: device.deviceId
    });
});

router.post('/telemetry', function (req, res, next) {
    if (device.regStatus == 'disabled') {
        res.render('telemetry', {
            title: "smart meter simulator",
            deviceId: device.deviceId,
            footer: 'ERROR: device is disabled, can\'t start telemetry'
        });
    } else {
        switch (req.body.action) {
            case 'on':
                if (req.body.interval !== '')
                    device.interval = req.body.interval;
                if (req.body.msgType !== '')
                    device.msgType = req.body.msgType;

                devfunc.updateTwin('interval', device.interval);
                devfunc.updateTwin('msgType', device.msgType);

                startTelemetry();

                msg = 'SUCCESS: starting telemetry at ' + device.interval + ' ms interval';
                res.render('telemetry', {
                    title: "smart meter simulator",
                    deviceId: device.deviceId,
                    interval: device.interval,
                    footer: msg
                });
                break;
            case 'off':
                clearInterval(myTimer);
                res.render('telemetry', {
                    title: "smart meter simulator",
                    deviceId: device.deviceId,
                    footer: 'Telemetry stopped.'
                });
                break;
        }
    }
})






