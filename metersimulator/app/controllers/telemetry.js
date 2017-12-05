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
var iothub = require('azure-iothub');
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;
var desiredVersion = null;
var registry, client;

/*
*
* 6. Compose the message and send it to IoT Hub
*
*/
var startTelemetry = function () {
    var client = utils.getClient();
    device.telemetry = true;
    // NOTE -> uses a global var interval, maybe better to localized it
    // Create a message and send it to the IoT Hub at interval
    myTimer = setInterval(function () {
        if (device.telemetry === 'change') {
            clearInterval(myTimer);
            device.telemetry = false;
            startTelemetry();
        }
        var reading = utils.getConsumption();
        var data = JSON.stringify({
            deviceId: device.deviceId,
            timestamp: Date.now(),
            consumption: reading.pwr,
            appliances: reading.applon
        });
        var message = XXXXXXXXXX;

        //akert for high consumption
        /*
        * 7. Add a property to the message for high consumption
        *
        */
        if (reading.pwr > 100) {
            message.XXXXXXXXXX
        }

        if (device.msgType === 'delta' && reading.pwr == lastMeterReading)
            console.log('skip messaging as no changes');
        else
            client.XXXXXXXX(XXXXXX, function (err, res) {
                if (err)
                    console.log('Message sending error: ' + err.toString());
                else
                    if (res) console.log('Message sending status: ' + res.constructor.name + ' > ' + new Date().toISOString());
            })
        lastMeterReading = reading.pwr;
    }, device.interval);
}

// ROUTING
module.exports = function (app) {
    app.use('/', router)
};

router.get('/telemetry', function (req, res, next) {
    device = utils.getDevice();
    res.render('telemetry', {
        title: "smart meter simulator",
        interval: device.interval,
        msgType: device.msgType,
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
                if (req.body.hasOwnProperty('interval')) {
                    device.interval = req.body.interval;
                    devfunc.updateTwin('interval', device.interval);
                }
                if (req.body.hasOwnProperty('msgType')) {
                    device.msgType = req.body.msgType;
                    devfunc.updateTwin('msgType', device.msgType);
                }

                startTelemetry();
                var msg = 'SUCCESS: starting telemetry at ' + device.interval + ' ms interval';

                res.render('telemetry', {
                    title: "smart meter simulator",
                    deviceId: device.deviceId,
                    interval: device.interval,
                    footer: msg
                });
                break;
            case 'off':
                clearInterval(myTimer);
                device.telemetry = false;
                res.render('telemetry', {
                    title: "smart meter simulator",
                    deviceId: device.deviceId,
                    footer: 'Telemetry stopped.'
                });
                break;
        }
    }
})
