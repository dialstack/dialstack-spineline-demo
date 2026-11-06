import { AsYouType } from 'libphonenumber-js';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toE164 } from '@c2c/phone';
import { colors, fonts, radius } from '../theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

interface Props {
  /** An E.164 number, or the digits as typed (an extension, say). */
  onCall: (destination: string) => void;
}

export function DialPad({ onCall }: Props) {
  const [digits, setDigits] = useState('');
  // A full phone number goes out as E.164; anything else, such as an
  // extension like 1001, goes out as typed. DialStack decides which it is.
  const destination = toE164(digits) ?? digits;
  const canCall = digits.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.display}>
        <Text style={[styles.number, !digits && styles.placeholder]} numberOfLines={1}>
          {digits ? new AsYouType('US').input(digits) : 'Enter a number'}
        </Text>
        {digits ? (
          <Pressable
            accessibilityLabel="Delete"
            hitSlop={12}
            onPress={() => setDigits((d) => d.slice(0, -1))}
          >
            <Text style={styles.backspace}>⌫</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.grid}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            onPress={() => setDigits((d) => d + k)}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
          >
            <Text style={styles.digit}>{k}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityLabel="Call"
        disabled={!canCall}
        onPress={() => onCall(destination)}
        style={[styles.call, !canCall && styles.disabled]}
      >
        <Text style={styles.callText}>Call</Text>
      </Pressable>
    </View>
  );
}

const KEY = 68;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
    alignItems: 'center',
  },
  display: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  number: { fontFamily: fonts.medium, fontSize: 28, color: colors.text },
  placeholder: { color: colors.subdued },
  backspace: { fontSize: 22, color: colors.subdued },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: KEY * 3 + 16 * 2,
    gap: 16,
  },
  key: {
    width: KEY,
    height: KEY,
    borderRadius: KEY / 2,
    backgroundColor: colors.offset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.border },
  digit: { fontFamily: fonts.medium, fontSize: 26, color: colors.text },
  call: {
    width: KEY * 3 + 16 * 2,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: colors.success,
    alignItems: 'center',
  },
  disabled: { opacity: 0.4 },
  callText: { fontFamily: fonts.semibold, color: '#fff', fontSize: 17 },
});
