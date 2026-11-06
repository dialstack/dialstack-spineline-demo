# Spineline click-to-call — the light-path demo

Spineline is DialStack's sample practice-management app for chiropractors (the
web app is one folder up). This is a second mobile companion, beside the in-app
calling one in [`../mobile`](../mobile): same sign-in, same clinic data, same
branding, but **the app is never the phone**. Tapping Call rings the user's own
cell over the carrier network, and DialStack connects them to the patient when
they answer.

It is the SDK's [`click-to-call`](https://github.com/dialstack/dialstack-sdk/tree/main/examples/mobile/click-to-call)
example dressed as a product. That README explains the DialStack side (the
`mobile` Find-Me/Follow-Me alternate, `POST /v1/calls`, the webhooks, call
control); this one only covers what Spineline adds.

| Tab          | What it shows                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------- |
| **Today**    | Today's appointments, one tap from a call                                                         |
| **Patients** | The practice's patients, searchable, one tap from a call                                          |
| **Phone**    | The call in progress with the patient's chart and End / Hold, the user's cell, and a number field |

## Why a separate app

The in-app calling demo connects its softphone at launch, in a push-woken
headless runtime and on every resume. A "ring my cell" mode inside it would have
to switch all of that off and keep it off, or the app would quietly start
ringing again. Here there is nothing to switch off: no WebRTC, no push, no
CallKit or Telecom, no microphone.

Incoming calls don't ring this app at all. They follow the user's normal
routing, plus their cell if they turn on "Also ring it for incoming calls".

## How it fits together

```
app ──sign in, patients──▶ Spineline backend
app ──place, hold, end──▶ click-to-call rig ──▶ DialStack ──rings──▶ user's cell
                              ▲                     │
                              └──── webhooks ───────┘
```

1. `POST /api/mobile/login` returns a Spineline bearer token, the same as
   `../mobile`.
2. `GET /api/dialstack/user` returns the practice's DialStack user, created if
   it has none yet. Its id is what the rig acts on.
3. Every DialStack call goes through the SDK example's rig, which holds the
   secret key. The app never sees the key.

The rig trusts whatever user id the app sends and authenticates no one, so it
listens on loopback only. That makes this a laptop demo. A real integration puts
these routes in its own backend, behind its own sign-in.

## Running the demo

Node 24. Three things run on your machine: Spineline, the rig, and the app.

**1. Spineline**, the web app in `..`, exposed on a tunnel. Sign in on the web
once and seed demo data from the tools panel, so Today and Patients have
something to show.

**2. The rig**, from the SDK example, against the **practice's** DialStack
account. That is `practices.dialstack_account_id`, the account Spineline created
at sign-up. The account needs a phone number for outbound caller ID, and it
has to be a **live** account: a sandbox account never dials real phone numbers,
so your cell would never ring. A Spineline running against a sandbox key (an
`sk_test_…`, as a local `npm run dev` often does) creates sandbox practices.

From a checkout of [dialstack-sdk](https://github.com/dialstack/dialstack-sdk).
In this monorepo that is `../../sdk`. From the public `dialstack-spineline-demo`
repo, clone `dialstack-sdk` next to it, at the same point in time (both on
`main`): the app imports files from it too (see "Shared files").

```bash
cd examples/mobile/click-to-call
npm install
cp .env.example .env.local   # DIALSTACK_ACCOUNT = the practice's account
set -a; . ./.env.local; set +a
npm run rig
```

For call status, tunnel the rig's webhook port (8789) and register it with all
five events. The example's README has the `curl`; keep
`call.command_succeeded` and `call.command_failed` in `enabled_events`, or Hold
and End stay pending until they time out.

**3. The app:**

```bash
npm install
cp .env.example .env.local   # EXPO_PUBLIC_SPINELINE_URL = the Spineline tunnel
npx expo run:android         # or: npx expo run:ios
```

On a physical Android device, `adb reverse tcp:8788 tcp:8788` and set
`EXPO_PUBLIC_RIG_URL=http://127.0.0.1:8788`. For an iPhone, see the example's
README.

In the app: sign in, enter your cell on the Phone tab, then call a patient. Demo
patients have fictional numbers, so to hear the whole call, give one of them a
second phone you have.

## Shared files

This app imports, rather than copies, what it shares with two other apps:

- `@spineline/…`, from `../mobile`: sign-in (`auth.tsx`, and the root layout and
  login routes, which `src/app/` re-exports), the Spineline API client,
  `useRemote`, and the screen chrome.
- `@c2c/…`, from the SDK's click-to-call example: the rig client (`rig.ts`),
  `phone.ts`, `useActiveCall`, `useShownCall`, the call text, and the cleartext
  config plugin.

Those files import their config, storage, session and theme as `@/…`, which
resolves to this app's `src/`. So the same `auth.tsx` signs in without WebRTC
here, and `rig.ts` reads this app's rig URL.

- `tsconfig.json` maps the aliases for TypeScript, plus a catch-all `"*"` path so
  the imported files find their packages' types in this app.
- `metro.config.js` maps them for the bundle. Expo's own tsconfig-paths support
  is off, or the catch-all would send packages to their types at runtime.
- `app.config.js` adds the shared config plugin.
- Each lists the monorepo path first, then the sibling `dialstack-sdk` clone.

Change shared files in their source. Everything else here is this app's own.

## Checks

```bash
npm run precommit   # format, lint, typecheck
```
