'use strict';

var express = require('express'),
    router = express.Router();
var utils = require('../lib/utils');
var devfunc = require('../lib/devfunc');

var Device = require('../models/device');
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

var deviceKey = '';
var deviceId = '';
var cs = '', devCS = '', hubName = '';
var msg = '',
    c2dmsg = 'no message reveived';

var myTimer,
    msgType = 'stream',
    interval = null,
    telemetry = false;

var watt = 0;
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

function setDeviceCS(cs, deviceId, key) {
    hubName = cs.substring(cs.indexOf('=') + 1, cs.indexOf(';'));
    devCS = 'HostName=' + hubName + ';DeviceId=' + deviceId + ';SharedAccessKey=' + key;
    utils.setDevice(cs, deviceId, devCS);
    utils.setDeviceKey(deviceKey);
}

var createSession = function () {
    var Device = utils.getDevice();
    
    if (Device.client == null) {
        var client = clientFromConnectionString(Device.cs);
        utils.setClient(client);
    }

    client.open(function (err) {
        if (err) { //something really fishy, report and leave the flow
            return false;
        } else {
            utils.setConnectionState('open');
            console.log('session created');
            // ARCH NOTE: read last received message -> move this outside this loop
            client.on('message', function (msg) {
                c2dmsg = ('Id: ' + msg.messageId + ' Body: ' + msg.data);
                client.complete(msg, printResultFor('completed'));
            });

            // subscribed to property changes
            // ARCH NOTE: move this outside of this loop
            client.getTwin(function (err, twin) { // check if he telemetry interval has ben set by the operator    
                if (err) {
                    console.error('could not get twin');
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
                    return true;
                }
            });
        }
    });
}

var startTelemetry = function (client) {
    // NOTE -> uses a global var interval, maybe better to localized it
    // Create a message and send it to the IoT Hub at interval
    telemetry = true;
    myTimer = setInterval(function () {
        var reading = utils.getConsumption();
        var data = JSON.stringify({ deviceId: deviceId, timestamp: Date.now(), consumption: reading.pwr, appliances: reading.appls });
        var message = new Message(data);

        //akert for high consumption
        if (reading.pwr > 55) {
            message.properties.add('usagealert', 'true');
        }

        if (msgType == 'delta') {
            if (reading != watt) {
                client.sendEvent(message, printResultFor('send'));
                watt = reading;
            } else
                console.log('skip mesaging as no changes');
        } else
            client.sendEvent(message, printResultFor('send'));
    }, interval);
}


// ROUTING
module.exports = function (app) {
    app.use('/', router)
};

router.get('/', function (req, res, next) {
    var exists = utils.getExists();
    if (!exists) {
        res.render('index', {
            title: "smart meter simulator",
            footer: 'the IOT HUB connection string is available on the azure portal'
        });
    }
    else {
        var Device = utils.getDevice();
        createSession();
        res.render('messaging', {
            title: "smart meter simulator",
            deviceId: Device.id,
            footer: "device already registered, resuming"
        });
    }
});

router.post('/', function (req, res, next) {
    switch (req.body.action) {
        case 'register':
            if (!utils.getExists()) { // first time using this device
                cs = req.body.cs;
                var registry = iothub.Registry.fromConnectionString(cs);

                // register device if not already done
                // then save the device suthentication key
                // var device = new iothub.Device(null);
                deviceId = req.body.devID;
                var device = { deviceId: deviceId };

                registry.create(device, function (err, deviceInfo, result) {
                    if (err) { // error regsitering to hub
                        registry.get(device.deviceId, function (err, deviceInfo, res) {
                            if (deviceInfo) {
                                deviceKey = deviceInfo.authentication.symmetricKey.primaryKey;
                                setDeviceCS(cs, deviceId, deviceKey);
                                createSession(); // really crap code, assumes that session creation will always succeeds
                            }
                            else // something really wrong happened, break the flow and show the error
                                res.render('error', { error: err });
                        });
                        res.render('index', {
                            title: "smart meter simulator",
                            deviceId: deviceId,
                            footer: "ERROR: " + err.message + " You can continue with this ID or try again with a different one"
                        });
                    } else {
                        deviceKey = deviceInfo.authentication.symmetricKey.primaryKey;
                        setDeviceCS(cs, deviceId, deviceKey);
                        createSession(); // really crap code, assumes that session creation will always succeeds

                        msg = "device successfully registered with IoT Hub";
                        res.render('messaging', {
                            title: "smart meter simulator",
                            deviceId: deviceId,
                            footer: msg
                        });
                    }
                });
            } else { // this device already gone through registration
                createSession(); // really crap code, assumes that session creation will always succeeds

                msg = "device already registered, restoring";
                res.render('messaging', {
                    title: "smart meter simulator",
                    deviceId: deviceId,
                    footer: msg
                });
            }
            break;

        case 'delete':
            //do something here
            break;
        default:
            console.log('cant get there form here');
    }
});

router.get('/c2d', function (req, res, next) {

    res.render('c2d', {
        title: "smart meter simulator",
        deviceId: deviceId,
        msg: c2dmsg
    });
})
router.get('/msg', function (req, res, next) {
    res.render('messaging', {
        title: "smart meter simulator",
        interval: interval,
        deviceId: deviceId
    });
});

router.post('/msg', function (req, res, next) {
    //var timer = 10;
    switch (req.body.action) {
        case 'on':
            var Device = utils.getDevice();

            if (req.body.interval != '')
                interval = req.body.interval;
            if (req.body.msgType != '')
                msgType = req.body.msgType;

            devfunc.updateTwin('interval', interval);
            devfunc.updateTwin('msgType', msgType);
            utils.setTelemetryValues({ 'interval': interval, 'msgType': msgType })
            startTelemetry(Device.client);

            msg = 'starting telemetry at ' + interval + ' ms interval';
            res.render('messaging', {
                title: "smart meter simulator",
                deviceId: deviceId,
                interval: interval,
                footer: msg
            });
            break;
        case 'off':
            clearInterval(myTimer);
            res.render('messaging', {
                title: "smart meter simulator",
                deviceId: deviceId,
                footer: 'Telemetry stopped.'
            });
            break;
    }
})






