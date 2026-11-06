import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clock, endedText, failureText } from '@c2c/callText';
import { useClickToCall } from '../clickToCall';
import { formatForDisplay } from '@c2c/phone';
import { isFinished, type CallRecord } from '@c2c/rig';
import { colors, fonts, radius } from '../theme';
import { PatientChart } from './PatientChart';

function banner(call: CallRecord, mobile: string | null, now: number): string {
  if (call.pending === 'hangup') return 'Ending…';
  switch (call.phase) {
    case 'calling_you':
      return mobile ? `Calling your phone · ${formatForDisplay(mobile)}` : 'Calling your phone…';
    case 'dialing':
      return 'You picked up · dialing…';
    case 'connected':
      if (call.held) return 'On hold';
      return call.connectedAt
        ? `On call · ${clock((now - Date.parse(call.connectedAt)) / 1000)}`
        : 'On call';
    case 'ended':
      return endedText(call);
    // Nothing reports why: the user may not have answered, or the number may
    // not have been dialable.
    case 'not_answered':
      return 'The call wasn’t connected';
  }
}

/**
 * The call placed through the user's cell: who it is with, where it stands,
 * and what can be done from here. Audio is on the cell's own call screen.
 */
export function CallPanel({ call }: { call: CallRecord }) {
  const { profile, control, dismiss } = useClickToCall();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (call.phase !== 'connected') return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [call.phase]);

  const done = isFinished(call);
  const busy = !!call.pending;
  const holdLabel =
    call.pending === 'hold'
      ? 'Holding…'
      : call.pending === 'unhold'
        ? 'Resuming…'
        : call.held
          ? 'Resume'
          : 'Hold';

  return (
    <View style={styles.panel}>
      <View
        style={[
          styles.banner,
          (done || call.held) && styles.bannerMuted,
          (call.phase === 'calling_you' || call.phase === 'dialing') && styles.bannerRinging,
        ]}
      >
        <Text style={styles.bannerText}>{banner(call, profile?.number ?? null, now)}</Text>
      </View>
      <View style={styles.body}>
        <PatientChart number={call.to} />
        {call.phase === 'calling_you' ? (
          <Text style={styles.hint}>Answer your phone to be connected, or decline to cancel.</Text>
        ) : null}
        {call.error && !done ? <Text style={styles.error}>{failureText(call.error)}</Text> : null}
      </View>
      <View style={styles.footer}>
        {call.phase === 'calling_you' ? (
          // No call id yet, so this only leaves the screen; declining on the
          // phone is what stops it ringing.
          <Pressable style={[styles.bar, styles.barOutline]} onPress={dismiss}>
            <Text style={[styles.barText, { color: colors.accent }]}>Close</Text>
          </Pressable>
        ) : null}
        {call.phase === 'connected' ? (
          <Pressable
            style={[styles.bar, styles.barOutline, busy && styles.disabled]}
            onPress={() => control(call.held ? 'unhold' : 'hold')}
            disabled={busy}
          >
            <Text style={[styles.barText, { color: colors.accent }]}>{holdLabel}</Text>
          </Pressable>
        ) : null}
        {call.phase === 'dialing' || call.phase === 'connected' ? (
          <Pressable
            style={[styles.bar, styles.barEnd, busy && styles.disabled]}
            onPress={() => control('hangup')}
            disabled={busy}
          >
            <Text style={[styles.barText, { color: '#fff' }]}>
              {call.pending === 'hangup' ? 'Ending…' : 'End call'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderRadius: radius * 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  banner: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.success },
  bannerRinging: { backgroundColor: colors.accent },
  bannerMuted: { backgroundColor: colors.subdued },
  bannerText: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
  body: { flex: 1, padding: 12, gap: 10 },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.subdued },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.danger },
  footer: { flexDirection: 'row', gap: 8, padding: 12, paddingTop: 0 },
  bar: { flex: 1, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  barOutline: { borderWidth: 1, borderColor: colors.border },
  barEnd: { backgroundColor: colors.danger },
  barText: { fontFamily: fonts.semibold, fontSize: 15 },
  disabled: { opacity: 0.5 },
});
