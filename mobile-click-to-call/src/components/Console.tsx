import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useClickToCall } from '../clickToCall';
import { dialable, searchPatients } from '../patient';
import { formatForDisplay } from '@c2c/phone';
import { listPatientsByName, type Patient } from '@spineline/spineline';
import { colors, fonts, radius } from '../theme';
import { useRemote } from '@spineline/useRemote';
import { DialPad } from './DialPad';
import { PatientRow } from './PatientRow';

/**
 * Before a call, as in the web app's softphone: find a patient by name or
 * number and call them, call whatever number was typed, or use the dial pad.
 */
export function Console() {
  const { place } = useClickToCall();
  const { data: patients } = useRemote(listPatientsByName, [] as Patient[]);
  const [query, setQuery] = useState('');
  const [keypad, setKeypad] = useState(false);

  const matches = useMemo(() => searchPatients(patients, query), [patients, query]);
  // A typed number that is not on file can still be called.
  const typed = dialable(query);

  if (keypad) {
    return (
      <View style={styles.flex}>
        <Pressable onPress={() => setKeypad(false)} hitSlop={8} style={styles.switch}>
          <Text style={styles.link}>Search patients</Text>
        </Pressable>
        <DialPad onCall={place} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search patients or type a number"
          placeholderTextColor={colors.subdued}
          autoCorrect={false}
        />
        <Pressable onPress={() => setKeypad(true)} hitSlop={8}>
          <Text style={styles.link}>Keypad</Text>
        </Pressable>
      </View>
      {typed && matches.length === 0 ? (
        <Pressable style={styles.typed} onPress={() => place(typed)}>
          <Text style={styles.typedText}>Call {formatForDisplay(typed)}</Text>
        </Pressable>
      ) : null}
      <FlatList
        data={matches}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <PatientRow patient={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switch: { alignSelf: 'flex-end', marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  search: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  link: { fontFamily: fonts.semibold, color: colors.accent },
  list: { gap: 8, paddingBottom: 24 },
  typed: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  typedText: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
});
