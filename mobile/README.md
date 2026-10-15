# Spineline mobile — the demo app

Spineline is DialStack's sample practice-management app for chiropractors
(the web app is one folder up, in `..`). This is its
mobile companion: the same sign-in, the same clinic data and the same branding,
with a DialStack softphone that rings on a locked phone.

It is the [`os-integration`](https://github.com/dialstack/dialstack-sdk/tree/main/examples/mobile/os-integration) example dressed as a product, so
Level 1 and Level 2 can be shown rather than described:

| Tab          | What it shows                                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Today**    | Today's appointments from Spineline's database, one tap from a call                                                                                                   |
| **Patients** | The practice's patients, searchable, one tap from a call                                                                                                              |
| **Phone**    | The softphone. A small toggle in the header switches between the SDK's `<Softphone />` and Spineline's own screens on `useSoftphone()`, over the same live connection |

Level 2 (CallKit / Telecom and push wake) is on under both UIs: lock the phone
and call it.

A call from a number on file is a patient call everywhere it appears: the
lock-screen call (Spineline-branded, named by the push harness from Spineline's
patients), the Phone tab while it rings (next visit, last visit, age) and once it
is live. Tapping the ringing notification opens the app on the ringing call
rather than the bare OS screen.

> **Demo shortcut, not a pattern to copy:** the lock-screen name and visits ride
> in the push payload, so patient data passes through Google's and Apple's push
> servers. A real integration sends only the call id and has the native call
> service fetch the caller's details from its own backend before showing the
> call.

## How it signs in

There is no token pasted into the app. It signs in to Spineline, and Spineline
mints the DialStack session:

1. `POST /api/mobile/login` with email and password returns a Spineline bearer token.
2. The phone's `onTokenExpiring` calls `POST /api/dialstack/webrtc-session` with
   that bearer, which mints a `client_secret` for the practice's DialStack user
   with the server-side secret key. This also runs in a push-woken process with no
   UI, so both tokens are kept on disk (`src/storage.ts`).
3. The push harness registers the device for the user Spineline resolves from the
   same bearer. The app never sends a user id.

Signing out unregisters the device, disconnects the phone and clears its token,
so the next practice to sign in on the phone gets its own session.

## Running the demo

Node 24. You need three things running: Spineline's backend, the push harness,
and the app.

**1. Spineline**, the web app in `..`, pointed at your DialStack environment
(`DIALSTACK_API_URL`, `NEXT_PUBLIC_DIALSTACK_API_URL`, and that environment's
secret and publishable keys). Expose it on a public URL with any tunnel, so a
phone off your network can reach it. Sign in on the web once, and seed demo data
from the web app's tools panel so Today and Patients have something to show.

**2. The app's dependencies:**

```bash
npm install
cp .env.example .env.local   # then fill it in
```

`EXPO_PUBLIC_SPINELINE_URL` is the Spineline tunnel.

The OS layer (the CallKit/Telecom adapter, call bridge, background-timers module
and wake config plugins) is a copy of the [`os-integration`](https://github.com/dialstack/dialstack-sdk/tree/main/examples/mobile/os-integration) example's.
It only exists to make this a working example.

**3. Push wake.** Firebase / APNs, `mobile_push_wakeup` on the user, the webhook
endpoint and the harness are set up exactly as in the
[`os-integration` README](https://github.com/dialstack/dialstack-sdk/tree/main/examples/mobile/os-integration#testing-a-wake-end-to-end),
with three differences:

- The bundle id / package is `ai.dialstack.spineline.demo`.
- The harness needs `SPINELINE_URL` (where it checks registrations) and no
  DialStack key.
- `/devices` takes the app's Spineline bearer, not a `user_id`. Registration
  happens on sign-in.
- The debug routes, `GET /devices` (who is registered) and `POST /test` (send a
  wake push without a real call), are served on the next port, on loopback only
  (`http://127.0.0.1:8788` by default), so the tunnel never reaches them.

**4. Build and run:**

```bash
npm run prebuild
CI=1 npx expo run:android   # or: CI=1 npx expo run:ios --device
```

CallKit and push wake need a physical iPhone; the iOS simulator gets neither.

`CI=1` keeps `expo run` non-interactive but also turns off Metro's file watching,
so edits after it starts never reach the app. To iterate, run Metro on its own
without it: `npx expo start --dev-client`.

## Recording a demo

- **iPhone:** connect it over USB, then QuickTime Player → New Movie Recording →
  pick the iPhone as the camera. This captures the lock screen and CallKit too.
- **Android:** `scrcpy --record demo.mp4` mirrors and records at once (good for a
  live screen share), or `adb shell screenrecord /sdcard/demo.mp4` (3-minute cap).

A good script: sign in → Today → call a patient from the list → toggle Drop-in /
Custom mid-call → hang up → lock the phone and call it from the web Spineline
softphone → answer on the lock screen.

## What the wake path does

1. A call arrives for a user with `mobile_push_wakeup` on and no live
   registration. DialStack parks the INVITE and sends the
   `call.mobile_push_wakeup` webhook to the integrator's backend.
2. The backend sends the push — a high-priority FCM data message on Android, an
   APNs VoIP push on iOS.
3. The call library reports the call to Telecom/CallKit **with no JS running** —
   the phone rings instantly — and starts the app (a headless JS task on Android;
   PushKit launches the process on iOS).
4. The app boots, the SDK re-REGISTERs, and DialStack re-forks the parked
   INVITE. An Answer tapped while this ran is applied on arrival.

If nothing is delivered within 5s of registering, the bridge ends the OS session
and drops the registration so the next call parks again.

One call therefore reaches the app twice, once as the push and once over the
socket, and both carry the same `call_id`. The push has to include the
`call.mobile_push_wakeup` webhook's `call_id` (the harness sends it as
`serverCallId`), and the bridge pairs the OS session with the call that arrives
on the socket by that id. A push without one gets its OS session ended, since no
call could ever pair with it.

This example keeps `maxOsCalls` at 1 because it doesn't support multi-call yet:
a second concurrent call rings in-app but gets no OS session. Android enforces
one session anyway (Telecom refuses a second); CallKit does not, so the bridge
applies the cap and the two platforms behave alike.

`scripts/` is a **local test harness**, not the shape of a real integration: it
keeps device tokens in memory and accepts unsigned webhooks unless
`DIALSTACK_WEBHOOK_SECRET` is set. A real integrator runs a deployed server with
durable token storage, mandatory signature verification and a stable URL.

## Call audio

With a bridge the provider runs with `callAudio="host"`, so CallKit/Telecom own
the audio session and this app supplies the rest.

- **Speaker button:** the adapter's `audioOutput` feeds the softphone's
  `audioOutput` prop. It shows only the route the OS reports, so a switch from
  the CallKit screen or the Android call notification shows up in-app too.
  The button is a speaker toggle, not a device list: the call library can
  override to the speaker but cannot select a specific device. A headset takes
  the route when it connects, and turning the speaker off picks the best
  non-speaker device.
- **Ringback:** the call library plays `assets/sounds/ringback.wav`, started and
  stopped by the SDK through the adapter's `ringback`, with the web's rules:
  from alerting (180) until answer, and never over early media.
- **Proximity:** `CallProximity` blanks the screen at the ear from placing a call
  until it ends, only while the route is the earpiece.

Keep InCallManager to its screen and proximity calls. Its ringback runs its own
device selection and moves the audio to the speaker behind Telecom's back.

## Swapping the call library

`src/os/expoCallKitTelecomAdapter.ts` is the only file that imports
`expo-callkit-telecom`, so a callkeep (or hand-rolled CallKit/Telecom) twin is a
drop-in that exports the same `expoCallKitTelecom()` shape, `{ os, ringback,
audioOutput }`, and `src/callBridge.ts` changes one import. An eslint rule holds that
line: a second subscriber to the OS call events races the bridge on every answer,
and the two then disagree about who owns the session.

Two things about the port are easy to get wrong; the contract suite in
`@dialstack/sdk-native/testing` is what catches them.

**Report outbound calls, not just inbound.** On iOS CallKit owns the audio
session, so an unreported outbound call gets no call UI, no audio-session
activation and no system call-log entry. On Android the report is what starts
the network-bearing foreground service, so a backgrounded outbound call is
reaped mid-dial. Report before placing, and end the OS session if placement
fails.

**Replay events that fired before JS subscribed.** A push-woken call is reported
natively before any runtime exists, so its `incomingReported` — and an Answer
tapped on the lock screen seconds later — happen with nothing listening. An
adapter must queue those and flush them to the first subscriber. Otherwise a
cold-start call rings and then does nothing when answered.

## Checks

```bash
npm run typecheck && npm run lint && npm run format:check
```
