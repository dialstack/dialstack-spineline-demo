import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput } from 'react-native';
import { PatientRow } from '../../components/PatientRow';
import { Screen } from '@spineline/components/Screen';
import { searchPatients } from '../../patient';
import { listPatientsByName, type Patient } from '@spineline/spineline';
import { colors, fonts, radius } from '../../theme';
import { useRemote } from '@spineline/useRemote';

/** The practice's patients from Spineline's database, one tap from a call through your cell. */
export default function Patients() {
  const {
    data: patients,
    error,
    loading,
    refresh,
  } = useRemote(listPatientsByName, [] as Patient[]);
  const [query, setQuery] = useState('');
  const shown = useMemo(() => searchPatients(patients, query), [patients, query]);

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
        renderItem={({ item }) => <PatientRow patient={item} />}
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
});
