'use strict';

var express = require('express'),
  router = express.Router();

var iothub = require('azure-iothub');
var Registry = require('azure-iothub').Registry;
var Client = require('azure-iothub').Client;
var deviceId = 'not selected';
var connectionString = '';

var client,
  registry;

var location = 'not yet reported',
  lastBlockTime = 'not yet reported',
  connType,
  version,
  interval,
  lastRead,
  msg;


function printDeviceInfo(deviceInfo, res) {

  if (deviceInfo)
    console.log('Device ID: ' + deviceInfo.deviceId);
  else
    console.log('deviceInfo: ' + JSON.stringify(deviceInfo))
}

var queryTwins = function (prop, key, res, next) {
  var devices = [];

  var registry = iothub.Registry.fromConnectionString(connectionString);

  switch (prop) {
    case 'zip':
      var query = registry.createQuery("SELECT * FROM devices WHERE tags.location.zipcode = '" + key + '\'', 100);
      break;
    case 'version':
      console.log('searching: ' + JSON.stringify(twin.properties.reported.fw_version.version));
      var query = registry.createQuery("SELECT * FROM devices WHERE properties.reported.fw_version.version = '" + key + '\'', 100);
      break;
  }
  query.nextAsTwin(function (err, results) {
    if (err) {
      console.error('Failed to fetch the results: ' + err.message);
    }
    else {

      for (var i = 0; i < results.length; i++)
        devices.push(results[i].deviceId)

      res.render('queryresults', {
        title: 'utility mgmt console',
        devices: devices,
        footer: msg
      });
    }
  })
}

function getDesiredProperties(res, next) {
  var desiredFW = 'unknown'
  var desiredInterval = 'unknown'

  registry.getTwin(deviceId, function (err, twin) {
    if (err)
      console.error(err.constructor.name + ': ' + err.message);
    else {

      if (twin.properties.desired.fw != undefined)
        desiredFW = twin.properties.desired.fw.version;

      if (twin.properties.desired.interval != undefined)
        desiredInterval = twin.properties.desired.interval.ms;

      console.log('desired fw: ' + desiredFW)
      console.log('desired interval: ' + desiredInterval)
    }

    res.render('twindes', {
      title: 'utility mgmt console',
      deviceId: deviceId,
      version: desiredFW,
      interval: desiredInterval,
      footer: 'desired properties'
    });
  })
}

function getReportedProperties(res, next) {
  registry.getTwin(deviceId, function (err, twin) {
    msg = 'reported properties';
    if (twin.properties.reported.iothubDM != null) {
      if (err) {
        msg = 'Could not query twins: ' + err.constructor.name + ': ' + err.message;
      } else {
        lastBlockTime = twin.properties.reported.iothubDM.block.lastBlock;
      }
    }
    if (twin.properties.reported.fw_version != null) {
      if (err) {
        msg = 'Could not query twins: ' + err.constructor.name + ': ' + err.message;
      } else {
        version = twin.properties.reported.fw_version.version;
      }
    }
    if (twin.properties.reported.interval != null) {
      if (err) {
        msg = 'Could not query twins: ' + err.constructor.name + ': ' + err.message;
      } else {
        interval = twin.properties.reported.interval.ms;
      }
    }

    res.render('twin', {
      title: 'utility mgmt console',
      deviceId: deviceId,
      lastBlockTime: lastBlockTime,
      version: version,
      interval: interval,
      footer: 'reported properties'
    });
  });
}

function setDesiredProperty(res, next, choice, prop) {
  registry.getTwin(deviceId, function (err, twin) {
    if (err) {
      console.error(err.constructor.name + ': ' + err.message);
    } else {

      switch (choice) {
        case 'fw':
          var patch = { properties: { desired: { fw: { version: prop } } } };
          break;

        case 'interval':
          var patch = { properties: { desired: { interval: { ms: prop } } } };
          break;
      }
      twin.update(patch, function (err) {
        if (err) {
          console.error('Could not update twin: ' + err.constructor.name + ': ' + err.message);
        } else {
          getDesiredProperties(res, next);
        }
      });
    }
  });
}

/* ------------------------------------
ROUTING
------------------------------------ */
module.exports = function (app) {
  app.use('/', router);
};

router.get('/device', function (req, res, next) {
  res.render('device', {
    title: 'utility mgmt console',
    deviceId: deviceId,
    footer: 'enter device id'
  });
});

router.post('/device', function (req, res, next) {
  deviceId = req.body.devID;

  //check if device id has been provisioned
  registry.get(deviceId, function (err, deviceInfo, result) {
    if (err) {
      console.log('ERROR: ' + err)
      res.render('device', {
        title: 'utility mgmt console',
        deviceId: 'incorrect device id',
        footer: 'enter device id'
      });
    }

    if (deviceInfo)
      res.render('commands', {
        title: 'utility mgmt console',
        deviceId: deviceId,
        footer: 'successfully connected to ' + deviceId
      });
  });
});

router.get('/tags', function (req, res, next) {

  if (deviceId == 'not selected')
    res.render('done', {
      title: 'utility mgmt console',
      msg: 'no device selected, choose device on the top bar or via search'
    });
  else
    registry.getTwin(deviceId, function (err, twin) {
      if (err) {
        console.error(err.constructor.name + ': ' + err.message);
        res.render('done', {
          title: 'utility mgmt console',
          msg: 'no device selected, choose device on the top bar or via search'
        });
      } else {

        res.render('tags', {
          title: 'utility mgmt console',
          location: twin.tags.location.zipcode,
          connType: twin.tags.connectivity.type
        });
        console.log(twin.tags)
      }
    });
});

router.get('/des', function (req, res, next) {
  getDesiredProperties(res, next);
});

router.post('/des', function (req, res, next) {
  switch (req.body.action) {
    case 'fw':
      setDesiredProperty(res, next, 'fw', req.body.fw)
      break;
    case 'interval':
      setDesiredProperty(res, next, 'interval', req.body.interval)
      break;

  }
});

router.get('/twin', function (req, res, next) {
  console.log('device id on get: ' + deviceId)
  if (deviceId != 'not selected')
    // fetch twin properties here
    getReportedProperties(res, next);
  else
    res.render('twin', {
      title: 'utility mgmt console',
      footer: 'no device selected'
    });
});

router.post('/twin', function (req, res, next) {
  switch (req.body.action) {
    case 'refresh':
      getReportedProperties(res, next);
      break;
    default:
      msg = req.body.action;
      res.render('twin', {
        title: 'utility mgmt console',
        deviceId: deviceId,
        location: location,
        lastbBlockTime: lastbBlockTime,
        connType: connType,
        version: version,
        footer: msg
      });
      break;
  }

});

router.get('/search', function (req, res, next) {
  console.log('search')
  res.render('search', {
    title: 'utility mgmt console',
    deviceId: deviceId,
    footer: 'search form button pressed'
  });
});

router.post('/search', function (req, res, next) {
  console.log('search: ' + JSON.stringify(req.body))
  switch (req.body.action) {
    case 'version':
      queryTwins('version', req.body.fw, res, next)
      var msg = 'searching fw' + req.body.fw
      break;
    case 'zip':
      queryTwins('zip', req.body.zip, res, next)
      var msg = 'searching zip' + req.body.zip
      break;
  }
});

router.get('/commands', function (req, res, next) {
  res.render('commands', {
    title: 'utility mgmt console',
    deviceId: deviceId
  });
});

router.post('/commands', function (req, res, next) {
  console.log('client: ' + client)
  switch (req.body.action) {
    case 'block':
      var methodName = "block";
      var msg = '';
      var methodParams = {
        methodName: methodName,
        payload: null,
        timeoutInSeconds: 30
      };

      client.invokeDeviceMethod(deviceId, methodParams, function (err, result) {
        console.log('requested block');

        if (err) {
          msg = "Direct method error: " + err.message;
        } else {
          msg = "Successfully invoked the device to cut supply.";
        }

        res.render('commands', {
          title: 'utility mgmt console',
          deviceId: deviceId,
          footer: msg
        });
      });
      break;
  }
});

router.post('/devsel', function (req, res, next) {
  deviceId = Object.keys(req.body)[0];

  res.render('device', {
    title: 'utility mgmt console',
    deviceId: deviceId
  });
});

router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'utility mgmt console'
  });
});

router.post('/', function (req, res, next) {
  connectionString = req.body.cs;
  var hubName = connectionString.substring(connectionString.indexOf('=') + 1, connectionString.indexOf('.'));
  registry = Registry.fromConnectionString(connectionString);
  client = Client.fromConnectionString(connectionString);
  res.render('done', {
    title: 'utility mgmt console',
    msg: 'select device via top bar or search menu',
    footer: 'successfully connected to: ' + hubName
  });
});

