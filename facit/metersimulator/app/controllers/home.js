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
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

// azure sdk
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Client = require('azure-iot-device').Client;
var desiredVersion = null;
var client, thisTwin;
var hubName, customerList;

var deviceKey = '';
var deviceId = '';
var msg = '',
    c2dmsg = 'false';
var appliancesArray = [];

// auxiliary functions
function initDevice(did, key) {
    device = new Device();

    device.deviceId = did;
    device.cs = 'HostName=' + hubName + ';DeviceId=' + did + ';SharedAccessKey=' + key;
    device.appliances = utils.initAppliances();
}

function configDevice(callback) {
    client.getTwin(function (err, twin) { // check if he telemetry interval has ben set by the operator    
        if (err) {
            return callback(err);
        } else {
            thisTwin = twin;
        }
        twin.on('properties.desired', function (desiredChange) {
            if (twin.properties.desired.$version !== desiredVersion) {
                desiredVersion = twin.properties.desired.$version;

                console.log(desiredChange)
                // stop telemetry and restart again with a new frequency
                if (desiredChange.hasOwnProperty('telemetry')) {
                    device.telemetry = desiredChange.telemetry
                }

                if (device.messaging = 'on') {
                    device.messaging = 'change';
                }
            }
        });

        return callback(null);
    })
}

// ROUTING
module.exports = function (app) {
    app.use('/', router)
};

router.get('/', function (req, res, next) {
    utils.getExists(function (err, dev) {
        if (!dev) {
            request('http://localhost:3000', function (error, response, body) {
                customerList = JSON.parse(body).customerList;
                res.render('index', {
                    title: "SUCCESS: smart meter simulator",
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
                footer: 'SUCCESS: ' + deviceId + ' previously registered'

            });
        }
    });
});

router.post('/', function (req, res, next) {
    switch (req.body.action) {
        case 'register':
            hubName = customerList[req.body.custIdx] + '.azure-devices.net'
            var did = req.body.devID;
            utils.regDevice(did, req.body.custIdx, function (err, devKey) {
                if (err)
                    res.render('error', { error: err });
                else {
                    initDevice(did, devKey);
                    utils.setDevice(device);
                    res.render('status', {
                        title: "smart meter simulator",
                        deviceId: did,
                        status: 'inactive',
                        footer: 'SUCCESS: ' + deviceId + ' registered with IoT Hub'
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

router.get('/status', function (req, res, next) {
    res.render('status', {
        title: "smart meter simulator",
        deviceId: device.deviceId,
        status: device.status
    });
})

router.post('/status', function (req, res, next) {
    var errorFlag = false;

    if (device.status == 'active') {
        device.status = 'inactive';
        res.render('status', {
            title: "smart meter simulator",
            deviceId: device.deviceId,
            status: device.status,
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
            configDevice(function(err){
                if (err) { //something really fishy, report and leave the flow
                    res.render('error', { error: err });
                }res.render('status', {
                    title: "smart meter simulator",
                    deviceId: device.deviceId,
                    status: device.status,
                    footer: 'MQTT session created'
                });
            });

            };
        });
    }

    //listener for direct messages
    client.on('message', function (msg) {
        console.log(msg)
        c2dmsg = msg;
        console.log(c2dmsg)
        client.complete(msg, function (err) {
            if (err)
                console.log(err)
        });
    });

    // register listeners to direct methods
    devfunc.initDM(client, function (err) {
        if (err)
            errorFlag = true;
    });
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






