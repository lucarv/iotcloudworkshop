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
  utils.persistDevice();
  console.log('shutting down. clean up')
})

var express = require('express'),
  config = require('./config/config');

var app = express();

module.exports = require('./config/express')(app, config);

app.listen(config.port, function () {
  console.log('Express server listening on port ' + config.port);
});

