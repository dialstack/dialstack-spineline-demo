import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useClickToCall } from '../clickToCall';
import { formatForDisplay } from '@c2c/phone';
import { patientName, type Patient } from '@spineline/spineline';
import { colors, fonts, radius } from '../theme';

/** A patient with their number, one tap from a call through the user's cell. */
export function PatientRow({ patient }: { patient: Patient }) {
  const { place } = useClickToCall();
  const name = patientName(patient);
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>
          {patient.first_name[0]}
          {patient.last_name[0]}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>
          {patient.phone ? formatForDisplay(patient.phone) : 'No phone on file'}
        </Text>
      </View>
      {patient.phone ? (
        <Pressable style={styles.call} onPress={() => place(patient.phone!, name)}>
          <Text style={styles.callText}>Call</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  call: {
    backgroundColor: colors.success,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  callText: { fontFamily: fonts.semibold, color: '#fff', fontSize: 13 },
});
