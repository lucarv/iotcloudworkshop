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
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var client, Client = require('azure-iot-device').Client;
var Protocol = require('azure-iot-device-mqtt').Mqtt;

var des_interval = 'not checked', des_connType = 'not checked', des_version = 'not checked', des_msgType = 'not checked';

// routing 
module.exports = function (app) {
    app.use('/', router);
};

router.get('/properties', function (req, res, next) {
    var device = utils.getDevice();

    res.render('twin', {
        title: "smart meter simulator",
        footer: 'ready to manage device properties',
        deviceId: utils.getDevice().deviceId,
        frequency: device.telemetry.frequency,
        teleType: device.telemetry.type,
        connType: device.connType,
        fw: device.fw
    });
});

router.post('/properties', function (req, res, next) {
    var device = utils.getDevice();

    if (req.body.connType !== '') {
        devfunc.updateTwin('connType', req.body.connType);
        device.connType = req.body.connType;
    }

    if (req.body.fw!=='') {
        devfunc.updateTwin('fw', req.body.fw);
        device.fw = req.body.fw;
    }


    res.render('twin', {
        title: "smart meter simulator",
        footer: 'ready to manage device properties',
        deviceId: utils.getDevice().deviceId,
        frequency: device.telemetry.frequency,
        teleType: device.telemetry.type,
        connType: device.connType,
        fw: device.fw
    });
});
