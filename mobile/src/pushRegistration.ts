import { WAKE_REGISTRY_URL } from './config';
import { getWakePushToken } from './os/expoCallKitTelecomAdapter';
import { requestNotificationPermission } from './permissions';
import { getInstallId, getSpinelineToken } from './storage';

// The integrator's backend, which receives DialStack's `call.mobile_push_wakeup`
// webhook and sends the push. The rig in scripts/ plays that role; it resolves the
// user from the Spineline token, so the app never names a user id itself.

export async function registerForWakePush(log: (m: string) => void = () => {}): Promise<void> {
  const spinelineToken = getSpinelineToken();
  if (!WAKE_REGISTRY_URL || !spinelineToken) {
    log('wake registry URL unset or not signed in — skipping push registration');
    return;
  }
  // Android 13+: the incoming-call notification is a notification. A denial only
  // affects what the user SEES — the wake push is a data message, delivered and
  // handled by the native call service regardless — so register the token either
  // way. Gating registration on it left the device unknown to the backend until a
  // full relaunch, even after the user later granted it in Settings.
  if (!(await requestNotificationPermission())) {
    log('notification permission denied — the OS will not show the incoming call');
  }
  try {
    const { token, type } = await getWakePushToken();
    const res = await fetch(`${WAKE_REGISTRY_URL}/devices`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${spinelineToken}`,
      },
      body: JSON.stringify({ token, type, device_id: getInstallId() }),
    });
    log(
      res.ok
        ? `registered ${type} token for wake push`
        : `device registration failed: HTTP ${res.status}`
    );
  } catch (err) {
    log(`device registration error: ${String(err)}`);
  }
}
