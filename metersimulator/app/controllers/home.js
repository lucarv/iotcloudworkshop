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

    // STEP 2
    // create client object and save it in the model
    // utils.setClinet();

    // STEP 3
    // open the connection 
    // if any device twin document exists, use the relevant data 
    // to configure your device

    // STEP 5:
    // capture device twin document changes
    // and update the telemetry interval change

    // STEP 7:
    // capture cloud to device messages
    // and display on the UI

}

var startTelemetry = function (client) {
    // Create a message and send it to the IoT Hub at interval
    telemetry = true;
    myTimer = setInterval(function () {
        
        // STEP 3: create a message and send to IoT HUb at the 
        // configured telemetry interval
        // you can use the 

        // STEP 6:
        // add info to your message that will send an alert 
        // to a cloud application

    }, interval);
}


// ------------------------------------------------
// ROUTES
// ------------------------------------------------

module.exports = function (app) {
    app.use('/', router)
};

// ------------------------------------------------
// LANDING
// ------------------------------------------------
router.get('/', function (req, res, next) {

    res.render('index', {
        title: "smart meter simulator",
        footer: 'the IOT HUB connection string is available on the azure portal'
    });

});

// ------------------------------------------------
// DEVICE REGISTRATION
// ------------------------------------------------

router.post('/', function (req, res, next) {
    switch (req.body.action) {
        case 'register':
            cs = req.body.cs;
            deviceId = req.body.devID;

            // register device if not already done
            // then save the device suthentication key
            // add code here to register a new device with the Registry
            var registry = iothub.Registry.fromConnectionString(cs);
            var device = { deviceId: deviceId };

            // remember to save the relevant information you got from the device
            // using utils.setDevice()

            // create a protocl client and open a session
            createSession();

            res.render('messaging', {
                title: "smart meter simulator",
                deviceId: deviceId,
                footer: msg
            });

            break;

        case 'delete':
            //do something here
            break;
        default:
            //do something here
            break;
    }
});


// ------------------------------------------------
// TELEMETRY PAGE
// ------------------------------------------------

router.get('/msg', function (req, res, next) {
    res.render('messaging', {
        title: "smart meter simulator",
        interval: interval,
        deviceId: deviceId
    });
});

// ------------------------------------------------
// TELEMETRY SETTINGS
// ------------------------------------------------
router.post('/msg', function (req, res, next) {
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






