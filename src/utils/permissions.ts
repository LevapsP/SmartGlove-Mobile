import { PermissionsAndroid, Platform } from 'react-native';
import { logger } from './logger';

/**
 * Requests all Bluetooth permissions required for the app.
 * Android 12+ (API 31+) introduced granular BT permissions.
 * Older versions need ACCESS_FINE_LOCATION instead.
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel = Platform.Version as number;

    if (apiLevel >= 31) {
      // Android 12+ — new granular permissions
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      const allGranted = Object.values(results).every(
        r => r === PermissionsAndroid.RESULTS.GRANTED,
      );

      logger.info('Permissions', `API 31+ BT permissions: ${allGranted ? 'GRANTED' : 'DENIED'}`);
      return allGranted;
    } else {
      // Android 11 and below — only location needed for BT scan
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'SmartGlove Bluetooth',
          message: 'SmartGlove needs location access to scan for Bluetooth devices.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );

      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      logger.info('Permissions', `Location permission: ${granted ? 'GRANTED' : 'DENIED'}`);
      return granted;
    }
  } catch (e) {
    logger.error('Permissions', 'requestBluetoothPermissions threw', e);
    return false;
  }
}
