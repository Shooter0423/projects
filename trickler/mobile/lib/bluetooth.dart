/// Copyright (c) Ammolytics and contributors. All rights reserved.
/// Released under the MIT license. See LICENSE file in the project root for details.

import 'package:flutter/material.dart';
import 'package:flutter_blue/flutter_blue.dart';
import 'package:redux/redux.dart';
import 'dart:async';

import 'globals.dart';
import 'actions.dart';
import 'models/index.dart';

/// BluetoothApp is a class that is meant to be inherited in order
/// to allow for bluetooth functionality in a widget. It provides the
/// sub-class access to the connectToDevice, and disconnect methods.

abstract class BluetoothApp extends StatelessWidget {
  final Store<AppState> store;
  BluetoothApp({ Key key, this.store }) : super(key: key);

  final FlutterBlue flutterBlue = FlutterBlue.instance;

  /// subToBluetoothState reads, and subscribes to the phones bluetooth
  /// state via flutterBlue, and updates the AppState accordingly.

  subToBluetoothState() {
    flutterBlue.state.then((s) {
      store.dispatch(SetBluetoothState(s));
    });
    StreamSubscription btStateSubscription = flutterBlue.onStateChanged()
      .listen((s) {
        store.dispatch(SetBluetoothState(s));
      });
    store.dispatch(SetStateSubscription(btStateSubscription));
  }

  /// unsubFromBluetoothState cancels and removes the bluetooth state
  /// subscription. It then sets the bluetooth state to unknown.

  unsubFromBluetoothState() {
    store.state.btStateSubscription?.cancel();
    store.dispatch(SetStateSubscription(null));
    store.dispatch(SetBluetoothState(BluetoothState.unknown));
  }

  /// connectToDevice attempts to connect to a given BluetoothDevice. It is responsible for
  /// updating Connection Status, and Device Connection in the global DeviceState. If connected
  /// to the device it will call _findTricklerService, otherwise it will call disconnect.

  connectToDevice(BluetoothDevice device) {
    store.dispatch(SetConnectionStatus(BluetoothDeviceState.connecting));
    dynamic deviceConnection = flutterBlue
      .connect(device, timeout: Duration(seconds: 4)) // Attempt to connect for 4 seconds
      .listen((s) {
        store.dispatch(SetConnectionStatus(s));
        if (s == BluetoothDeviceState.connected) {
          _findTricklerService();
        } else {
          disconnect();
        }
      }, onDone: disconnect); // Callback is run on timeout or if connection to device is lost.
    store.dispatch(SetDeviceConnection(deviceConnection));
  }

  /// _findTricklerService reads the services being advertised by the device. It is responsible
  /// for finding a service that matches the TRICKLER_SERVICE_UUID, and saving it to the global
  /// DeviceState. Then it calls _readCharacteristics and passes in the service's charactersitics.

  _findTricklerService() {
    store.state.deviceState.device.discoverServices().then((services) {
      BluetoothService service = services
        .where((s) => s.uuid.toString() == TRICKLER_SERVICE_UUID).single;
      store.dispatch(SetService(service));
      _readCharacteristics(service?.characteristics, 0);
    });
  }

  /// _readCharacteristics asynchronously reads given BluetoothCharactersitics one by one in a Future Chain.
  /// It is responsible for reading, and setting an initial value for the characterisitic. As well as
  /// subscribing to any notify enabled charactersitics, and saving the updated values to global state. Once
  /// it is finished reading the characteristic at the given index it will call itself with the given
  /// characteristics, and the given index plus one to continue down the chain, until it gets to the end.

  _readCharacteristics(List<BluetoothCharacteristic> chars, int i) { 
    BluetoothDevice device = store.state.deviceState.device;
    BluetoothCharacteristic char = chars[i];

    if (char.properties.read && DONT_READ_CHARS.indexOf(char.uuid.toString()) == -1) {
      device.readCharacteristic(char).then((readChar) async {
        store.dispatch(SetCharacteristic(char.uuid, readChar));
        if (char.properties.notify) {
          // Subscribe to chars with notifications
          await device.setNotifyValue(char, true);
          StreamSubscription sub = device.onValueChanged(char).listen((data) {
            store.dispatch(SetCharacteristic(char.uuid, data));
          });
          store.dispatch(AddSubscription(sub)); // Save subscription so we can cancel it on disconnect.
        }

        if (i + 1 < chars.length) {
          _readCharacteristics(chars, i + 1);
        }
      });
    } else if (DONT_READ_CHARS.indexOf(char.uuid.toString()) == -1) {
      print('\n\n\nCAN\'T READ ${char.uuid.toString()}');
      print('\n\n${char.uuid.toString()} PROPERTIES');
      print('NOTIFY: ${char.properties.notify}');
      print('READ: ${char.properties.read}');
      print('WRITE: ${char.properties.write}\n\n');
    }
  }

  /// disconnect cancels all bluetooth related subscriptions, and resets the global device state.

  disconnect() {
    store.state.deviceState.characteristics.subscriptions
    .forEach((sub) {
      sub.cancel();
    });
    store.dispatch(ClearSubscriptions());
    print('\n\n\nDisconnecting...\n\n\n\n');
    store.state.deviceState.deviceConnection?.cancel();
    store.dispatch(ResetDeviceState());
  }

}
