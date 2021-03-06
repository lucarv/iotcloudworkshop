var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'agentconsole'
    },
    port: process.env.PORT || 3330,
  },

  test: {
    root: rootPath,
    app: {
      name: 'agentconsole'
    },
    port: process.env.PORT || 3300,
  },

  production: {
    root: rootPath,
    app: {
      name: 'agentconsole'
    },
    port: process.env.PORT || 3300,
  }
};

module.exports = config[env];
