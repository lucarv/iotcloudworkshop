'use strict';

var express = require('express'),
    router = express.Router();
var utils = require('../lib/utils');
var devfunc = require('../lib/devfunc');

//middleware
var bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

// azure sdk
var iothub = require('azure-iothub');
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;

var des_interval = 'not checked', des_connType = 'not checkd', des_version = 'not checked', des_msgType = 'not checked';

// routing 
module.exports = function (app) {
    app.use('/', router);
};

router.get('/device', function (req, res, next) {
    res.render('device', {
        deviceId: utils.getDevice().id
    });
});

router.post('/device', function (req, res, next) {
    var Device = utils.getDevice();
    cd = Device.cs;
    switch (req.body.action) {
        case 'activate':
            var client = clientFromConnectionString(cs);
            client.open(function (err) {
                if (err) {
                    console.log('Could not connect: ' + err);
                } else {
                    // start listeners
                    client.onDeviceMethod('block', devfunc.onBlock);
                    client.onDeviceMethod('release', devfunc.onRelease);
                }
            });
            res.render('messaging', {
                title: "smart meter simulator",
                deviceId: utils.getDevice().id,
                footer: 'starting listeners'
            });
            break;

        case 'deactivate':
            var client = clientFromConnectionString(cs);
            client.close(function (err) {
                if (err) {
                    console.log('Could not disconnect: ' + err);
                } else {
                    console.log('Client disconnected');
                }
            });
            res.render('device', {
                title: "smart meter simulator",
                deviceId: utils.getDevice().id,
                footer: 'closing connection to hub'
            });
            break;
        default:
            res.render('device', {
                title: "smart meter simulator",
                deviceId: utils.getDevice().id,
                footer: 'cant get there form here'
            });
    }
});

router.get('/properties', function (req, res, next) {
    var Device = utils.getDevice();

    var registry = iothub.Registry.fromConnectionString(Device.hubcs);
    var query = registry.createQuery("SELECT * FROM devices WHERE deviceId = '" + Device.id + '\'', 100);
    query.nextAsTwin(function (err, prop) {
        if (err)
            console.error('Failed to fetch the results: ' + err.message);
        else {
            if (prop.length > 0) {
                if (prop[0].properties.desired.hasOwnProperty('interval'))
                    des_interval = prop[0].properties.desired.interval.ms;
                else
                    des_interval = 'not set'

                if (prop[0].properties.desired.hasOwnProperty('telemetry'))
                    des_msgType = prop[0].properties.desired.telemetry.type;
                else
                    des_msgType = 'not set'

                if (prop[0].properties.desired.hasOwnProperty('connectivity'))
                    des_connType = prop[0].properties.desired.connectivity.type;
                else
                    des_connType = 'not set';

                if (prop[0].properties.desired.hasOwnProperty('fw_version'))
                    des_version = prop[0].properties.reported.fw_version.version;
                else
                    des_version = 'not set';
            }
        }
        res.render('twin', {
            title: "smart meter simulator",
            footer: 'ready to manage device properties',
            deviceId: Device.id,
            rep_interval: Device.interval,
            rep_connType: Device.connType,
            rep_version: Device.fw_version,
            rep_msgType: Device.msgType,
            des_interval: des_interval,
            des_msgType: des_msgType,
            des_connType: des_connType,
            des_version: des_version
        });
    })
});

router.get('/tags', function (req, res, next) {
    var Device = utils.getDevice();

    var registry = iothub.Registry.fromConnectionString(Device.hubcs);
    var query = registry.createQuery("SELECT * FROM devices WHERE deviceId = '" + Device.id + '\'', 100);
    query.nextAsTwin(function (err, prop) {
        if (err)
            console.error('Failed to fetch the results: ' + err.message);
        else {
            if (prop.length > 0) {
                if (prop[0].tags.hasOwnProperty(location))
                    var location = prop[0].tags.location.zipcode;
                else
                    var location = 'not set'
            }
        }
        res.render('tags', {
            title: "smart meter simulator",
            footer: 'ready to manage device properties',
            deviceId: Device.id,
            location: Device.location
        });
    })
});

router.post('/twin', function (req, res, next) {
    var Device = utils.getDevice();
    // bad code below, upodating the model from here. FIX IT
    switch (req.body.action) {
        case 'fw_version':
            devfunc.updateTwin('fw_version', req.body.fw_version);
            Device.fw_version = req.body.fw_version;
            break;
        case 'location':
            devfunc.updateTwin('location', req.body.location);
            Device.location = req.body.location;
            break;
        case 'connType':
            devfunc.updateTwin('connType', req.body.connType);
            Device.connType = req.body.connType;
            break;
    }

    res.render('twin', {
        title: "smart meter simulator",
        footer: 'ready to manage device properties',
        deviceId: Device.id,
        rep_interval: Device.interval,
        rep_connType: Device.connType,
        rep_version: Device.fw_version,
        rep_msgType: Device.msgType,
        des_interval: des_interval,
        des_msgType: des_msgType,
        des_connType: des_connType,
        des_version: des_version
    });
});
