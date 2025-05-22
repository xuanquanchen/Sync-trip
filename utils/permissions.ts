import { Platform, Alert } from 'react-native';
import {
  check,
  request,
  openSettings,
  PERMISSIONS,
  RESULTS,
  PermissionStatus,
} from 'react-native-permissions';

export async function ensureGalleryPermission(): Promise<boolean> {
  const permission =
    Platform.Version as number >= 33
      ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
      : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

  let status: PermissionStatus = await check(permission);

  if (status === RESULTS.UNAVAILABLE) {
    Alert.alert(
      'Not Supported',
      'Your device doesn’t support gallery access.'
    );
    return false;
  }

  if (status === RESULTS.DENIED) {
    status = await request(permission);
  }

  if (status === RESULTS.BLOCKED) {
    // User checked “Don’t ask again” — we must send them to Settings
    Alert.alert(
      'Permission Required',
      'We need access to your photos to upload a profile picture.\n\nPlease enable Gallery permission in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => openSettings(),
        },
      ]
    );
    return false;
  }

  return status === RESULTS.GRANTED;
}
