const util = require('util')
const events = require('events')
const Readline = require('@serialport/parser-readline')

const TricklerUnits = {
  GRAINS: 0,
  GRAMS: 1,
}

const TricklerStatus = {
  STABLE: 0,
  UNSTABLE: 1,
  OVERLOAD: 2,
  ERROR: 3,
}

const TricklerWeightStatus = {
  UNDER: 0,
  EQUAL: 1,
  OVER: 2,
}

const TricklerMotorStatus = {
  OFF: 0,
  ON: 1,
}

const UnitMap = {
  'GN': TricklerUnits.GRAINS,
  'g': TricklerUnits.GRAMS,
}

const StatusMap = {
  'ST': TricklerStatus.STABLE,
  // Counting mode
  'QT': TricklerStatus.STABLE,
  'US': TricklerStatus.UNSTABLE,
  'OL': TricklerStatus.OVERLOAD,
  'EC': TricklerStatus.ERROR,
}

const ErrorCodeMap = {
  'E00': 'Communications error',
  'E01': 'Undefined command error',
  'E02': 'Not ready',
  'E03': 'Timeout error',
  'E04': 'Excess characters error',
  'E06': 'Format error',
  'E07': 'Parameter setting error',
  'E11': 'Stability error',
  'E17': 'Internal mass error',
  'E20': 'Calibration weight error: The calibration weight is too heavy',
  'E21': 'Calibration weight error: The calibration weight is too light',
}


const parser = new Readline()

function Trickler(port) {
  events.EventEmitter.call(this)
  // Get values from scale over serial
  port.pipe(parser)
  parser.on('data', line => {
    var now = new Date(Date.now()).toISOString()
    var rawStatus = line.substr(0, 2).trim()
    var status = StatusMap[rawStatus]

    switch (status) {
      case undefined:
        // Unit not ready yet.
        break
      case TricklerStatus.ERROR:
        var errCode = line.substr(3, 3)
        var errMsg = ErrorCodeMap[errCode]
        console.error(`Error! code: ${errCode}, message: ${errMsg}`)
        break
      default:
        this.status = status
        var rawWeight = line.substr(3, 9).trim()
        var rawUnit = line.substr(12, 3).trim()
        var unit = UnitMap[rawUnit]
        // Make sure the unit is ready first, unit is defined.
        if (typeof unit !== 'undefined') {
          console.log(`${now}: ${rawStatus}, ${rawWeight}, ${rawUnit}, ${status}, ${unit}`)
          this.unit = unit
          this.weight = rawWeight

          this.emit('ready', rawWeight)
        }
        break
    }
  })
}


util.inherits(Trickler, events.EventEmitter)


Trickler.prototype.trickle = function(weight) {
  var self = this
  console.log('Running trickler...')
  // TODO: Send commands over serial, monitor status.
}


module.exports.Trickler = Trickler
module.exports.TricklerUnits = TricklerUnits
module.exports.TricklerStatus = TricklerStatus
module.exports.TricklerWeightStatus = TricklerWeightStatus
module.exports.TricklerMotorStatus = TricklerMotorStatus