import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSoftphone } from '@dialstack/sdk-native';

import { Screen } from '../../components/Screen';
import { listPatients, patientName, type Patient } from '../../spineline';
import { colors, fonts, radius } from '../../theme';
import { useRemote } from '../../useRemote';

const fetchPatients = async () =>
  (await listPatients()).sort((a, b) => a.last_name.localeCompare(b.last_name));

/** The practice's patients from Spineline's database, one tap from a call. */
export default function Patients() {
  const router = useRouter();
  const { placeCall, displayNumber } = useSoftphone();
  const { data: patients, error, loading, refresh } = useRemote(fetchPatients, [] as Patient[]);
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => patientName(p).toLowerCase().includes(q) || (p.phone ?? '').includes(q)
    );
  }, [patients, query]);

  const call = (number: string) => {
    router.navigate('/phone');
    placeCall(number).catch((err) => console.log(`[call] place failed: ${String(err)}`));
  };

  return (
    <Screen title="Patients" subtitle={`${patients.length} on file`}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or number"
        placeholderTextColor={colors.subdued}
        autoCorrect={false}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={shown}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>
                {item.first_name[0]}
                {item.last_name[0]}
              </Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>{patientName(item)}</Text>
              <Text style={styles.meta}>
                {item.phone ? displayNumber(item.phone) : 'No phone on file'}
              </Text>
            </View>
            {!!item.phone && (
              <Pressable style={styles.callBtn} onPress={() => call(item.phone!)}>
                <Text style={styles.callText}>Call</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: { fontFamily: fonts.regular, color: colors.danger, paddingHorizontal: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSubdued,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fonts.semibold, color: colors.accent, fontSize: 14 },
  body: { flex: 1 },
  name: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.subdued },
  callBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  callText: { fontFamily: fonts.semibold, color: '#fff', fontSize: 13 },
});
