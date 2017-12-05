'use strict';
var express = require('express'),
    router = express.Router();
var utils = require('../lib/utils');
var devfunc = require('../lib/devfunc');

var Device = require('../models/device'),
    device;

//middleware
var bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

// azure sdk - ADD THE PROPER LIBRARIES
var iothub = XXXXXXXXX;
var clientFromConnectionString = XXXXXXXXX;
var Message = XXXXXXXXXXXXXX;
var Client = XXXXXXXXXXXXX;
var Protocol = XXXXXXX MQTT XXXXXXX;
var desiredVersion = null;
var registry, client;

var deviceKey = '';
var deviceId = '';
var cs = '', devCS = '', hubName = '';
var msg = '',
    c2dmsg = 'no message reveived';
var appliancesArray = [];

// auxiliary functions

function initDevice(cs, did, key) {
    device.deviceId = did;
    device.hubName = cs.substring(cs.indexOf('=') + 1, cs.indexOf(';'));
    device.hubcs = cs;
    device.cs = 'HostName=' + device.hubName + ';DeviceId=' + did + ';SharedAccessKey=' + key;
    device.appliances = utils.initAppliances();
    device.interval = 30000;
    device.msgType = 'stream'
}

function createSession(callback) {
    client = clientFromConnectionString(device.cs);
    utils.setClient(client);
    /*
    *
    * 1. open an MQTT session (look for the XXXX)
    * 2. create entry points for twin messages
    * 3. create entry points for d2c messages
    *
    */

    client.XXXXXXXX {
        if (err) { //something really fishy, report and leave the flow
            callback(err);
        } else {
            // subscribed to property changes
            // ARCH NOTE: move this outside of this loop
            client.XXXXXXXXXXX { // check if he telemetry interval has ben set by the operator    
                if (err) {
                    callback(err);
                } else {
                    twin.XXXXXXXXXX(XXXXXXXXXX, function (desiredChange) {
                        console.log('desired property change')
                        if (twin.properties.desired.$version !== desiredVersion) {
                            desiredVersion = twin.properties.desired.$version;
                            // stop telemetry and restart again with a new frequency
                            if (desiredChange.hasOwnProperty('interval')) {
                                device.interval = desiredChange.interval.ms
                                devfunc.updateTwin('interval', device.interval);
                            }
                            if (desiredChange.hasOwnProperty('telemetry')) {
                                console.log(desiredChane)
                                device.msgType = desiredChange.telemetry.msgType
                                devfunc.updateTwin('msgType', device.msgType);
                            }
                            if (device.telemetry) {
                                device.telemetry = 'change';
                            }
                            // add code here to manage other desired properties
                            // such as desired FW version
                            // .......
                        }
                    });
                }
            });
            // ARCH NOTE: read last received message -> move this outside this loop
            client.XXXXXXXXX(XXXXXXXXXXX, function (msg) {
                c2dmsg = ('Id: ' + msg.messageId + ' Body: ' + msg.data);
                console.log(c2dmsg)
                client.XXXXXXXXXXX(XXXXXXXXXXXXX, function(err){
                    console.log(err)
                });
            });
            callback(null);
        }
    });
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
                res.render('index', {
                    title: "smart meter simulator",
                    deviceId: 'not registered',
                    status: 'false',
                    footer: 'NOTE: The IOT HUB connection string is available on the azure portal'
                });
            }
            else {
                device = dev;
                console.log(dev)
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
            utils.setDevice(device);            
        }
    });
});

/*
*
* 4. Register a device using the data entered in the UI
*
*/
router.post('/', function (req, res, next) {
    switch (req.body.action) {
        case 'register':
            var hubcs = req.body.cs;
            var did = req.body.devID;

            registry = XXXXXXXXXXXX;
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
                    utils.setDevice(device);
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






