import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { lookupPatient, type PatientCard } from '../patient';
import { formatForDisplay } from '@c2c/phone';
import { colors, fonts, radius } from '../theme';

const onWeb = () => Alert.alert('Opens in the Spineline web app.');

/**
 * Who the call is with, as the web app's active-call card shows it: the
 * matched patient's details and quick actions, or that no patient matched.
 */
export function PatientChart({ number }: { number: string }) {
  const router = useRouter();
  const [card, setCard] = useState<PatientCard | null | undefined>(undefined);
  useEffect(() => {
    let current = true;
    lookupPatient(number).then(
      (c) => current && setCard(c),
      () => current && setCard(null)
    );
    return () => {
      current = false;
    };
  }, [number]);

  const display = formatForDisplay(number);

  if (card === undefined) {
    return (
      <View style={[styles.chart, styles.empty]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.meta}>Looking up patient…</Text>
      </View>
    );
  }

  if (card === null) {
    return (
      <View style={[styles.chart, styles.empty, styles.dashed]}>
        <Text style={styles.name}>{display}</Text>
        <Text style={styles.meta}>No matching patient found</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.chart}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{card.initials}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {card.name}
            </Text>
            <Text style={styles.meta}>
              {card.subtitle} · {display}
            </Text>
          </View>
        </View>
        {card.details.map((d) => (
          <View key={d.label} style={styles.fact}>
            <Text style={styles.factLabel}>{d.label}</Text>
            <Text style={styles.factValue} numberOfLines={1}>
              {d.value}
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        style={[styles.action, styles.primary]}
        onPress={() => router.navigate('/patients')}
      >
        <Text style={[styles.actionText, styles.primaryText]}>View patient</Text>
      </Pressable>
      <View style={styles.row}>
        <Pressable style={[styles.action, styles.flex]} onPress={onWeb}>
          <Text style={styles.actionText}>Add note</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.flex]} onPress={onWeb}>
          <Text style={styles.actionText}>Schedule</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  empty: { alignItems: 'center', gap: 6, padding: 20 },
  dashed: { borderStyle: 'dashed' },
  action: {
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accent },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  primaryText: { color: '#fff' },
  chart: {
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.offset,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 20, color: '#fff' },
  name: { fontFamily: fonts.semibold, fontSize: 20, color: colors.text },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.subdued },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  factLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.subdued },
  factValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
  },
});
