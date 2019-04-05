import '../actions.dart';
import '../models/index.dart';

part 'measurement_reducers.dart';
part 'device_reducers.dart';

AppState appStateReducer(AppState state, action) {
  return AppState(
    currentMeasurement: currentMeasurementReducer(state.currentMeasurement, action),
    measurementHistory: measuermentsReducer(state.measurementHistory, action),
    deviceState: deviceState(state.deviceState, action),
  );
}