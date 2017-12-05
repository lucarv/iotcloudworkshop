var utils = require('./app/lib/utils');
// does not work on windows....
/*
var ON_DEATH = require('death');
ON_DEATH(function(signal, err) {
  console.log(signal)
})
*/
//on windows

process.on('SIGINT', function () {
  console.log('trying shutting down. clean up...')

  // save device state
  utils.persistDevice(utils.getDevice(), function (err) {
    if (err)
      console.log('could not persist device state')
    else {
      console.log('device state persisted')
      // close open ports
      server.close(function (err) {
        if (err) {
          console.log(err);
          console.log('not able to shutdown gracefully');
        }
        else {
          console.log('all connections terminated');
        }
      });
    }
  });
});


var express = require('express'),
  config = require('./config/config');

var app = express();

module.exports = require('./config/express')(app, config);
var port = config.port;
var myArgs = process.argv.slice(2);
if (myArgs[0] == 'clean') {
  utils.persistDevice(undefined, function (err) {
    if (err)
      console.log(err)
  })
}
else {
  if (!isNaN(myArgs[0]))
    port = myArgs[0]
}

var server = app.listen(port, function () {
  console.log('Express server listening on port ' + port);
});


