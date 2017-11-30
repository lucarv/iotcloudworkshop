// Example model

function Device() {
  this.deviceId = null;
  this.cs = null;
  this.hubcs = null;
  this.appliances = [];
  this.location = 'not set';
  this.fw_version = 'not set';
  this.connType = 'not set';
  this.msgType = 'not set';
  this.interval = 60000;
  this.regStatus = true;
  this.client = null;
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

Device.prototype.setStatus = function (status) {
  this.status = status;
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

module.exports = Device;

