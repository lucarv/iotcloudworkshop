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

// ------------------------------------------------
// ROUTES
// ------------------------------------------------
module.exports = function (app) {
    app.use('/', router);
};

// ------------------------------------------------
// REPORT PROPERTY CHANGE
// ------------------------------------------------

router.post('/twin', function (req, res, next) {
    var Device = utils.getDevice();
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
