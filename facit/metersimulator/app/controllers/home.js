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

var deviceKey = '';
var deviceId = '';
var cs = '', devCS = '', hubName = '';
var msg = '',
    c2dmsg = 'no message reveived';

var myTimer,
    interval = 60000;
var watt = 0;
var msgType = '';
var appliancesArray = [];

// auxiliary functions
function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

function printDeviceInfo(err, deviceInfo, res) {
    if (deviceInfo) {
        deviceKey = deviceInfo.authentication.symmetricKey.primaryKey;
        utils.setDeviceKey(deviceKey);
    }
    if (err) console.log('printDeviceInfo error: ' + err.toString());
}

function sendTelemetry(intervalToUse, client, deviceId, msgType){
    // Create a message and send it to the IoT Hub at interval
    myTimer = setInterval(function () {
        var reading = utils.getConsumption();
        var data = JSON.stringify({ deviceId: deviceId, timestamp: Date.now(), consumption: reading.pwr, appliances: reading.appls });
        console.log(data);
        var message = new Message(data);

        if (msgType == 'delta') {
            if (reading != watt) {
                client.sendEvent(message, printResultFor('send'));
                watt = reading;
            } else
                console.log('skip mesaging as no changes');
        } else
            client.sendEvent(message, printResultFor('send'));
    }, intervalToUse);
}

// ROUTING
module.exports = function (app) {
    app.use('/', router)
};

router.get('/', function (req, res, next) {
    res.render('index', {
        title: "smart meter simulator",
        footer: 'tips: the connection string is available on the azure portal'
    });
});

router.post('/', function (req, res, next) {
    var timer = 10;
    switch (req.body.action) {
        case 'register':

            cs = req.body.cs;
            var registry = iothub.Registry.fromConnectionString(cs);

            // register device if not already done
            // then save the device suthentication key
            var device = {
                deviceId: null,
                status: 'enabled'
              };
            deviceId = req.body.devID;
            device.deviceId = req.body.devID;
            devCS = req.body.cs;

            // populate model
            utils.setDevice(deviceId, devCS);

            registry.create(device, function (err, deviceInfo, res) {
                if (err){
                    console.log('err registering device: ' + err);
                    registry.get(device.deviceId, printDeviceInfo);
                }
                if (deviceInfo)
                    printDeviceInfo(err, deviceInfo, res);
            });
            msg = "device successfully registered with IoT Hub";
            res.render('device', {
                title: "smart meter simulator",
                deviceId: deviceId,
                footer: msg
            });
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
        deviceId: deviceId
    });
});

router.post('/msg', function (req, res, next) {
    //var timer = 10;

    switch (req.body.action) {
        case 'on':
            var device = utils.getDevice();
            hubName = device.cs.substring(device.cs.indexOf('=') + 1, device.cs.indexOf(';'));
            devCS = 'HostName=' + hubName + ';DeviceId=' + device.id + ';SharedAccessKey=' + device.key;

            var client = clientFromConnectionString(devCS);
            if (req.body.interval != '')
                interval = req.body.interval;
            //devfunc.updateTwin('interval', interval);

            client.open(function (err) {
                if (err) {
                    msg = 'Could not connect: ' + err;
                } else {
                    // read last received message
                    client.on('message', function (msg) {
                        c2dmsg = ('Id: ' + msg.messageId + ' Body: ' + msg.data);
                        client.complete(msg, printResultFor('completed'));
                    })

                    //add callback to the directmethod 'shutdownUsage'
                    client.onDeviceMethod('shutdownUsage', devfunc.onBlock);
                    
                    //register for desired changes
                    client.getTwin(function(err, twin) {
                        if (err) {
                            console.error('could not get twin');
                        } else {
                            console.log('retrieved device twin');
                            
                            twin.on('properties.desired.interval', function(delta) {
                                console.log("received change: "+JSON.stringify(delta));
                                var currentInterval = interval;
                                if (delta.ms != currentInterval) {
                                    console.log("Updatig interval: " + delta.ms);
                                    interval = delta.ms;
                                    //update sampling rate
                                    clearInterval(myTimer);
                                    sendTelemetry(interval, client, deviceId, msgType);
                                }
                            });
                        }
                    });

                    //call setTimeout
                    sendTelemetry(interval, client, deviceId, msgType);
                    
                }
            })
            msg = 'starting telemetry at ' + interval + ' ms interval';

            res.render('c2d', {
                title: "smart meter simulator",
                deviceId: deviceId,
                footer: msg
            });
            break;
        case 'off':
            clearInterval(myTimer);
            res.render('messaging', {
                title: "smart meter simulator",
                deviceId: deviceId,
                footer: 'telemetry stopped'
            });
            break;
    }

})






