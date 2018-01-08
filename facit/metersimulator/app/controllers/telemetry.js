'use strict';
var express = require('express'),
    router = express.Router();
var utils = require('../lib/utils');
var devfunc = require('../lib/devfunc');

var device;
var lastMeterReading = 0;
var myTimer;

//middleware
var bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

// azure sdk
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;
var desiredVersion = null;

var startTelemetry = function () {
    var client = utils.getClient();

    // Create a message and send it to the IoT Hub at interval
    myTimer = setInterval(function () {
        if (device.messaging === 'change') {
            clearInterval(myTimer);
            device.messaging = 'off';
            startTelemetry();
        } else
            device.messaging = 'on';

        var reading = utils.getConsumption();
        var timeStamp = new Date().toISOString();
        var data = JSON.stringify({
            deviceId: device.deviceId,
            timestamp: timeStamp,
            consumption: reading.pwr,
            appliances: reading.applon
        });
        var message = new Message(data);

        //alert for high consumption
        if (reading.pwr > 100) {
            message.properties.add('usagealert', 'true');
        }

        if (device.telemetry.type === 'delta' && reading.pwr == device.lastTelemetry.value)
            console.log('skip messaging as no changes');
        else
            client.sendEvent(message, function (err, res) {
                if (err)
                    console.log('Message sending error: ' + err.toString());
                else {
                    device.lastTelemetry.timeStamp = timeStamp;
                    if (res) console.log('Message sending status: ' + res.constructor.name + ' > ' + timeStamp);
                    device.lastTelemetry.value = reading.pwr;

                }
            })
    }, device.telemetry.frequency);
}

// ROUTING
module.exports = function (app) {
    app.use('/', router)
};

router.get('/telemetry', function (req, res, next) {
    device = utils.getDevice();

    res.render('telemetry', {
        title: "smart meter simulator",
        frequency: device.telemetry.frequency,
        teleType: device.telemetry.type,
        deviceId: device.deviceId,
        status: device.status,
        messaging: device.messaging
    });
});

router.post('/telemetry', function (req, res, next) {  
    if (device.status !== 'active') {
        res.render('telemetry', {
            title: "smart meter simulator",
            deviceId: device.deviceId,
            status: device.status,
            messaging: device.messaging,
            footer: 'ERROR: device is disabled, can\'t start telemetry'
        });
    } else {
        switch (req.body.action) {
            case 'on':
                startTelemetry();

                res.render('telemetry', {
                    title: "smart meter simulator",
                    deviceId: device.deviceId,
                    frequency: device.telemetry.frequency,
                    teleType: device.telemetry.type,
                    status: device.status,
                    messaging: device.messaging,
                    footer: 'SUCCESS: starting telemetry at ' + device.telemetry.frequency + ' ms interval'
                });
                break;
            case 'off':
                clearInterval(myTimer);
                device.messaging = 'off';
                res.render('telemetry', {
                    title: "smart meter simulator",
                    deviceId: device.deviceId,
                    frequency: device.telemetry.frequency,
                    teleType: device.telemetry.type,
                    status: device.status,
                    messaging: device.messaging,
                    footer: 'SUCCESS: Telemetry stopped.'
                });
                break;
        }
    }
})
