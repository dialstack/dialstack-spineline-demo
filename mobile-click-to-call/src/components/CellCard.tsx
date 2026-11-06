import { isAvailableAsync, showPhoneNumberHintAsync } from 'expo-phone-number-hint';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useClickToCall } from '../clickToCall';
import { formatForDisplay, toE164 } from '@c2c/phone';
import { colors, fonts, radius } from '../theme';

/**
 * The user's own cell: where calls placed from the app ring first, and,
 * optionally, a phone incoming calls ring too. No app can read its own number;
 * Android can offer the SIM's, iOS AutoFill the contact card's.
 */
export function CellCard() {
  const { profile, saveNumber, removeNumber, setInbound } = useClickToCall();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canPickFromSim, setCanPickFromSim] = useState(false);

  useEffect(() => {
    void isAvailableAsync().then(setCanPickFromSim);
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setEditing(false);
      setDraft('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pickFromSim = async () => {
    setError(null);
    try {
      const result = await showPhoneNumberHintAsync();
      if (!result.canceled) setDraft(result.hint.e164 ?? result.hint.number);
    } catch {
      setError('This phone didn’t offer a number. Type it instead.');
    }
  };

  const save = () => {
    const e164 = toE164(draft);
    if (!e164) return setError('Enter a valid phone number');
    void run(() => saveNumber(e164));
  };

  if (profile === undefined) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (profile.number === null || editing) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Your cell</Text>
        <Text style={styles.help}>
          Calls you place ring this phone first, then connect to the patient when you answer.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Your cell number"
          placeholderTextColor={colors.subdued}
          keyboardType="phone-pad"
          autoComplete="tel"
          value={draft}
          onChangeText={setDraft}
          editable={!busy}
        />
        {canPickFromSim ? (
          <Pressable onPress={() => void pickFromSim()} disabled={busy} hitSlop={8}>
            <Text style={styles.link}>Use this phone’s number</Text>
          </Pressable>
        ) : null}
        <View style={styles.actions}>
          {profile.number !== null ? (
            <Pressable
              style={styles.secondary}
              onPress={() => {
                setEditing(false);
                setDraft('');
                setError(null);
              }}
            >
              <Text style={styles.link}>Cancel</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.primary} onPress={save} disabled={busy}>
            <Text style={styles.primaryText}>{busy ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.label}>Your cell</Text>
          <Text style={styles.number}>{formatForDisplay(profile.number)}</Text>
        </View>
        <Pressable onPress={() => setEditing(true)} disabled={busy} hitSlop={8}>
          <Text style={styles.link}>Change</Text>
        </Pressable>
        <Pressable onPress={() => void run(removeNumber)} disabled={busy} hitSlop={8}>
          <Text style={[styles.link, { color: colors.danger }]}>Remove</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.toggleLabel}>Also ring it for incoming calls</Text>
          <Text style={styles.help}>
            Rings with the practice’s other phones. Press a key to answer, so voicemail can’t.
          </Text>
        </View>
        <Switch
          value={profile.inbound}
          onValueChange={(on) => void run(() => setInbound(on))}
          disabled={busy}
          trackColor={{ true: colors.accent }}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.subdued,
    textTransform: 'uppercase',
  },
  number: { fontFamily: fonts.semibold, fontSize: 20, color: colors.text },
  help: { fontFamily: fonts.regular, fontSize: 13, color: colors.subdued },
  toggleLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  link: { fontFamily: fonts.semibold, color: colors.accent },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radius,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  primaryText: { fontFamily: fonts.semibold, color: '#fff' },
  secondary: { paddingVertical: 10, paddingHorizontal: 12 },
  error: { fontFamily: fonts.regular, color: colors.danger },
});
