// Example model


function Device(hubcs, id, cs) {
  this.id = id;
  this.cs = cs;
  this.hubcs = hubcs;
  this.key = null;
  this.appliances = [];
  this.location = 'not set';
  this.fw_version = 'not set';
  this.connType = 'not set';
  this.interval = 60000;
  this.client = null;
  this.connectionState = null;
  this.msgType = 'not set';
}

Device.prototype.getDeviceId = function () {
  return this.id
}

Device.prototype.getConnectionString = function () {
  return this.cs
}

Device.prototype.setDeviceConnectionString = function (devcs) {
  this.devcs = devcs;
}

Device.prototype.getDevConnectionString = function () {
  return this.devcs;
}

Device.prototype.setAppliances = function (appl) {
  this.appliances = appl;
}

Device.prototype.getAppliances = function () {
  return this.appliances;
}

Device.prototype.setClient = function (client) {
  this.client = client;
}

module.exports = Device;

