/**
 * Copyright (c) Ammolytics and contributors. All rights reserved.
 * Released under the MIT license. See LICENSE file in the project root for details.
 */
const util = require('util')
const bleno = require('bleno')
const trickler = require('./trickler')


function AutoModeCharacteristic(trickler) {
  bleno.Characteristic.call(this, {
    uuid: '10000005-be5f-4b43-a49f-76f2d65c6e28',
    properties: ['read', 'write', 'notify'],
    descriptors: [
      new bleno.Descriptor({
        uuid: '2901',
        value: 'Start/stop automatic trickle mode'
      })
    ]
  })

  this.trickler = trickler
}


util.inherits(AutoModeCharacteristic, bleno.Characteristic)


AutoModeCharacteristic.prototype.sendAutoModeNotification = function(result) {
  if (this.updateValueCallback) {
    var data = Buffer.alloc(1)
    data.writeUInt8(result, 0)
    this.updateValueCallback(data)
  }
}

AutoModeCharacteristic.prototype.onReadRequest = function(offset, callback) {
  if (offset) {
    callback(this.RESULT_ATTR_NOT_LONG, null)
  } else {
    var data = new Buffer(1);
    data.writeUInt8(this.trickler.autoMode, 0);
    callback(this.RESULT_SUCCESS, data)
  }
}


AutoModeCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
  this.maxValueSize = maxValueSize
  this.updateValueCallback = updateValueCallback

  if (typeof this._autoModeNotifyRef === 'undefined') {
    this._autoModeNotifyRef = this.sendAutoModeNotification.bind(this)
  }
  this.trickler.on('autoMode', this._autoModeNotifyRef)
}


AutoModeCharacteristic.prototype.onUnsubscribe = function() {
  this.maxValueSize = null
  this.updateValueCallback = null

  this.trickler.removeListener('autoMode', this._autoModeNotifyRef)
}


AutoModeCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
  console.log(`onWrite called: ${arguments}`)
  if (offset) {
    callback(this.RESULT_ATTR_NOT_LONG)
  } else if (data.length !== 1) {
    callback(this.RESULT_INVALID_ATTRIBUTE_LENGTH)
  } else {
    var autoMode = data.readUInt8(0)
    console.log(`request to switch autoMode from ${this.trickler.autoMode} to ${autoMode}`)
    if (typeof this._autoModeNotifyRef === 'undefined') {
      this._autoModeNotifyRef = this.sendAutoModeNotification.bind(this)
    }
    this.trickler.once('autoMode', this._autoModeNotifyRef)
    this.trickler.autoMode = autoMode

    switch (autoMode) {
      case trickler.AutoModeStatus.ON:
        this.trickler.on('ready', this._autoModeNotifyRef)
        break
      case trickler.AutoModeStatus.OFF:
        this.trickler.removeListener('ready', this._autoModeNotifyRef
        break
    }
    callback(this.RESULT_SUCCESS)
  }
}

module.exports = AutoModeCharacteristic
