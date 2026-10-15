import { useMemo } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSoftphone } from '@dialstack/sdk-native';

import { useAuth } from '../../auth';
import { Screen } from '../../components/Screen';
import {
  listAppointments,
  listPatients,
  patientName,
  type Appointment,
  type Patient,
} from '../../spineline';
import { colors, fonts, radius } from '../../theme';
import { useRemote } from '../../useRemote';

const TYPE_LABEL: Record<Appointment['type'], string> = {
  initial: 'Initial consult',
  adjustment: 'Adjustment',
  walk_in: 'Walk-in',
  follow_up: 'Follow-up',
};

async function fetchToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const [appts, pts] = await Promise.all([listAppointments(start, end), listPatients()]);
  return {
    appointments: appts.sort((a, b) => a.start_at.localeCompare(b.start_at)),
    patients: new Map(pts.map((p) => [p.id, p])),
  };
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Today's schedule from Spineline's appointments table — the web Home, on a phone. */
export default function Today() {
  const router = useRouter();
  const { placeCall, calls } = useSoftphone();
  const { signOut } = useAuth();
  const { data, error, loading, refresh } = useRemote(fetchToday, {
    appointments: [] as Appointment[],
    patients: new Map<number, Patient>(),
  });
  const { appointments, patients } = data;

  const stats = useMemo(
    () => ({
      total: appointments.length,
      confirmed: appointments.filter((a) => a.status === 'accepted').length,
      pending: appointments.filter((a) => a.status === 'pending').length,
    }),
    [appointments]
  );

  const confirmSignOut = () => {
    if (calls.some((c) => c.state !== 'ended')) {
      Alert.alert('End the call first');
      return;
    }
    Alert.alert('Sign out?', 'This phone stops ringing for your practice.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const call = (number: string) => {
    router.navigate('/phone');
    placeCall(number).catch((err) => console.log(`[call] place failed: ${String(err)}`));
  };

  return (
    <Screen
      title="Today"
      subtitle={new Date().toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })}
      right={
        <Pressable onPress={confirmSignOut} hitSlop={8}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      }
    >
      <View style={styles.stats}>
        <Stat label="Appointments" value={stats.total} />
        <Stat label="Confirmed" value={stats.confirmed} />
        <Stat label="Pending" value={stats.pending} />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={appointments}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          loading ? null : (
            <Text style={styles.empty}>
              No appointments today. Seed demo data from the web app.
            </Text>
          )
        }
        renderItem={({ item }) => {
          const patient = item.patient_id ? patients.get(item.patient_id) : undefined;
          const name = patient ? patientName(patient) : (item.customer_name ?? 'Walk-in');
          const phone = patient?.phone || item.customer_phone;
          return (
            <View style={styles.row}>
              <View style={styles.timeCol}>
                <Text style={styles.time}>{time(item.start_at)}</Text>
                <Text style={styles.timeEnd}>{time(item.end_at)}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.meta}>{TYPE_LABEL[item.type]}</Text>
              </View>
              <StatusPill status={item.status} />
              {!!phone && (
                <Pressable style={styles.callBtn} onPress={() => call(phone)}>
                  <Text style={styles.callText}>Call</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: Appointment['status'] }) {
  const ok = status === 'accepted';
  return (
    <View style={[styles.pill, ok ? styles.pillOk : styles.pillPending]}>
      <Text style={[styles.pillText, { color: ok ? colors.success : colors.subdued }]}>
        {ok ? 'Confirmed' : status.replace('_', ' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  signOut: { fontFamily: fonts.medium, color: colors.accent },
  stats: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  statValue: { fontFamily: fonts.semibold, fontSize: 22, color: colors.accent },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.subdued },
  error: { fontFamily: fonts.regular, color: colors.danger, paddingHorizontal: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  empty: { fontFamily: fonts.regular, color: colors.subdued, textAlign: 'center', marginTop: 40 },
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
  timeCol: { width: 64 },
  time: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  timeEnd: { fontFamily: fonts.regular, fontSize: 12, color: colors.subdued },
  body: { flex: 1 },
  name: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.subdued },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillOk: { backgroundColor: colors.successSubdued },
  pillPending: { backgroundColor: colors.offset },
  pillText: { fontFamily: fonts.medium, fontSize: 11, textTransform: 'capitalize' },
  callBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  callText: { fontFamily: fonts.semibold, color: '#fff', fontSize: 13 },
});
