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

var location = 'not yet set',
  lastBlockTime = 'not yet reported',
  connType = 'not yet reported',
  fw_version = 'not yet set',
  interval = 'not yet reported',
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
  var desiredConnType = 'not yet set';
  var desiredInterval = 'not yet set';
  var desiredFW = 'not yet set';
  var desiredLocation = 'not yet set';


  registry.getTwin(deviceId, function (err, twin) {
    if (err)
      console.error(err.constructor.name + ': ' + err.message);
    else {
      if (twin.properties.desired.hasOwnProperty('connectivity'))
        desiredConnType = twin.properties.desired.connectivity.type;

      if (twin.properties.desired.hasOwnProperty('interval'))
        desiredInterval = twin.properties.desired.interval.ms;

      if (twin.properties.desired.hasOwnProperty('fw'))
        desiredFW = twin.properties.desired.fw.version;

      if (twin.properties.desired.hasOwnProperty('fw'))
        desiredFW = twin.properties.desired.fw.version;
    }

    res.render('twindes', {
      title: 'utility mgmt console',
      deviceId: deviceId,
      connType: desiredConnType,
      interval: desiredInterval,
      version: desiredFW,
      location: desiredLocation,
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
        fw_version = twin.properties.reported.fw_version.version;
      }
    }
    if (twin.properties.reported.interval != null) {
      if (err) {
        msg = 'Could not query twins: ' + err.constructor.name + ': ' + err.message;
      } else {
        interval = twin.properties.reported.interval.ms;
      }
    }
    if (twin.properties.reported.hasOwnProperty('connectivity')) {
      if (err) {
        msg = 'Could not query twins: ' + err.constructor.name + ': ' + err.message;
      } else {
        connType = twin.properties.reported.connectivity.type;
      }
    }

    res.render('twin', {
      title: 'utility mgmt console',
      deviceId: deviceId,
      lastBlockTime: lastBlockTime,
      version: fw_version,
      interval: interval,
      connType: connType,
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
        if (twin.tags.hasOwnProperty('location'))
          location = twin.tags.location.zipcode;

        res.render('tags', {
          title: 'utility mgmt console',
          location: location
        });
      }
    });
});

router.get('/edit', function (req, res, next) {
  getDesiredProperties(res, next);
});

router.post('/edit', function (req, res, next) {
  switch (req.body.action) {
    case 'fw':
      setDesiredProperty(res, next, 'fw', req.body.fw_version)
      break;
    case 'interval':
      setDesiredProperty(res, next, 'interval', req.body.interval)
      break;
    case 'connType':
      setDesiredProperty(res, next, 'conType', req.body.connType)
      break;      

  }
});

router.get('/twin', function (req, res, next) {
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
        version: fw_version,
        footer: msg
      });
      break;
  }

});

router.get('/search', function (req, res, next) {
  res.render('search', {
    title: 'utility mgmt console',
    deviceId: deviceId,
    footer: 'search form button pressed'
  });
});

router.post('/search', function (req, res, next) {
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

