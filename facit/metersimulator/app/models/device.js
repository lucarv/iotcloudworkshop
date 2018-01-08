// Example model

function Device() {
  this.deviceId = null;
  this.cs = null;
  this.appliances = [];
  this.status = 'inactive';
  this.telemetry = { "frequency": 30000, "type": "delta" };
  this.messaging = 'off';
  this.connType = 'not set';
  this.fw = 'not set',
  this.lastTelemetry = {"value": "unknown", "timeStamp": "unknown"}
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

