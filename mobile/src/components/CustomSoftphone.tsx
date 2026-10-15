import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSoftphone, type Call } from '@dialstack/sdk-native';

import { patientCard } from '../caller';
import { listAppointments, listPatients, patientName, type Patient } from '../spineline';
import { colors, fonts, radius } from '../theme';
import { useRemote } from '../useRemote';
import { useCallerTitle } from './CallerDetails';
import { Icon, type IconName } from './TabIcon';

/**
 * Level 1, "your own UI": Spineline's front-desk console drawn on
 * useSoftphone(). It deliberately looks nothing like the SDK's softphone: no
 * keypad, calls start from the patient list, and a call is shown as the
 * patient's chart. The provider still tracks the calls and runs every action
 * (through the OS bridge at Level 2); this file only renders.
 */
export function CustomSoftphone() {
  const { activeCall, incomingCalls } = useSoftphone();
  const ringing = incomingCalls[0];
  if (ringing) return <Ringing call={ringing} />;
  if (activeCall) return <InCall call={activeCall} />;
  return <Console />;
}

const digitsOnly = (s: string) => s.replace(/\D/g, '');

async function fetchDirectory() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const [patients, appts] = await Promise.all([listPatients(), listAppointments(start, end)]);
  const byId = new Map(patients.map((p) => [p.id, p]));
  // Today's unconfirmed visits are the front desk's call list.
  const callbacks = appts
    .filter((a) => a.status === 'pending' && a.patient_id && byId.get(a.patient_id)?.phone)
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .map((a) => ({ patient: byId.get(a.patient_id!)!, at: a.start_at }));
  return { patients: patients.filter((p) => p.phone), callbacks };
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function Console() {
  const { placeCall, connection, lastError, displayNumber } = useSoftphone();
  const { data } = useRemote(fetchDirectory, {
    patients: [] as Patient[],
    callbacks: [] as { patient: Patient; at: string }[],
  });
  const [query, setQuery] = useState('');
  const ready = connection === 'connected';

  const q = query.trim().toLowerCase();
  const dialable = digitsOnly(q).length >= 3 && /^[\d\s()+-]+$/.test(q);
  const matches = useMemo(
    () =>
      q
        ? data.patients.filter(
            (p) =>
              patientName(p).toLowerCase().includes(q) ||
              (digitsOnly(q) && digitsOnly(p.phone ?? '').includes(digitsOnly(q)))
          )
        : data.patients,
    [q, data.patients]
  );

  const call = (number: string) =>
    placeCall(number).catch((err) => console.log(`[call] place failed: ${String(err)}`));

  return (
    <View style={styles.flex}>
      <View style={styles.lineBar}>
        <Text style={styles.lineName}>Front desk line</Text>
        <View style={[styles.dot, { backgroundColor: ready ? colors.success : colors.subdued }]} />
        <Text style={styles.lineState}>{ready ? 'Available' : connection}</Text>
      </View>

      <View style={styles.search}>
        <Icon name="search" size={16} color={colors.subdued} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Find a patient or type a number"
          placeholderTextColor={colors.subdued}
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => dialable && ready && call(q)}
        />
        {query.length > 0 && (
          <Pressable hitSlop={8} onPress={() => setQuery('')}>
            <Icon name="x" size={16} color={colors.subdued} />
          </Pressable>
        )}
      </View>
      {lastError && <Text style={styles.error}>{lastError.message}</Text>}

      <FlatList
        data={matches}
        keyExtractor={(p) => String(p.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {dialable && (
              <PatientRow
                initials="#"
                title={`Call ${displayNumber(q)}`}
                meta="Not a patient on file"
                disabled={!ready}
                onCall={() => call(q)}
              />
            )}
            {!q && data.callbacks.length > 0 && (
              <>
                <Text style={styles.section}>Confirm today’s visits</Text>
                {data.callbacks.map(({ patient, at }) => (
                  <PatientRow
                    key={`cb-${patient.id}-${at}`}
                    initials={initialsOf(patient)}
                    title={patientName(patient)}
                    meta={`${time(at)} · awaiting confirmation`}
                    tag="Callback"
                    disabled={!ready}
                    onCall={() => call(patient.phone!)}
                  />
                ))}
              </>
            )}
            <Text style={styles.section}>{q ? 'Matching patients' : 'Patient directory'}</Text>
          </>
        }
        renderItem={({ item }) => (
          <PatientRow
            initials={initialsOf(item)}
            title={patientName(item)}
            meta={displayNumber(item.phone!)}
            disabled={!ready}
            onCall={() => call(item.phone!)}
          />
        )}
      />
    </View>
  );
}

const initialsOf = (p: Patient) => `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`;

function PatientRow(props: {
  initials: string;
  title: string;
  meta: string;
  tag?: string;
  disabled: boolean;
  onCall: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{props.initials}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {props.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {props.meta}
        </Text>
      </View>
      {props.tag && (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{props.tag}</Text>
        </View>
      )}
      <Pressable
        accessibilityLabel={props.title}
        disabled={props.disabled}
        style={({ pressed }) => [
          styles.rowCall,
          props.disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={props.onCall}
      >
        <Icon name="phone" size={16} color="#fff" />
      </Pressable>
    </View>
  );
}

/** The patient's chart header: who, and the visits the push/lookup found. */
function Chart({ call }: { call: Call }) {
  const { title, number, initials, looking } = useCallerTitle(call);
  const card = patientCard(call);
  return (
    <View style={styles.chart}>
      <View style={styles.chartHead}>
        <View style={[styles.avatar, styles.avatarLarge]}>
          <Text style={[styles.avatarText, styles.avatarTextLarge]}>{initials ?? '#'}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.chartName} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.rowMeta}>
            {card
              ? `${card.subtitle} · ${number}`
              : title !== number
                ? number
                : looking
                  ? ' '
                  : 'Not on file'}
          </Text>
        </View>
      </View>
      {card?.details.map((d) => (
        <View key={d.label} style={styles.fact}>
          <Text style={styles.factLabel}>{d.label}</Text>
          <Text style={styles.factValue}>{d.value}</Text>
        </View>
      ))}
    </View>
  );
}

function Ringing({ call }: { call: Call }) {
  const { answerCall, actions } = useSoftphone();
  return (
    <View style={styles.flex}>
      <View style={[styles.banner, styles.bannerRinging]}>
        <Icon name="phone" size={16} color="#fff" />
        <Text style={styles.bannerText}>Incoming · Front desk line</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Chart call={call} />
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.bar, styles.barOutline, pressed && styles.pressed]}
          onPress={() => actions.callActionsFor(call).reject()}
        >
          <Text style={[styles.barText, { color: colors.danger }]}>Decline</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.bar, styles.barAnswer, pressed && styles.pressed]}
          onPress={() => answerCall(call)}
        >
          <Icon name="phone" size={18} color="#fff" />
          <Text style={styles.barText}>Answer</Text>
        </Pressable>
      </View>
    </View>
  );
}

function InCall({ call }: { call: Call }) {
  const { actions, duration, audio } = useSoftphone();
  const held = call.state === 'held';
  const live = call.state === 'active';
  const demo = (what: string) => Alert.alert(what, 'Opens in the Spineline web app.');

  return (
    <View style={styles.flex}>
      <View style={[styles.banner, held && styles.bannerHeld]}>
        <View style={[styles.dot, styles.dotLive]} />
        <Text style={styles.bannerText}>{held ? 'On hold' : live ? 'On call' : 'Calling…'}</Text>
        <Text style={styles.bannerTimer}>{live || held ? duration : ''}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Chart call={call} />
        <Text style={styles.section}>During this call</Text>
        <View style={styles.quick}>
          <Quick icon="calendar" label="Book visit" onPress={() => demo('Book visit')} />
          <Quick icon="file" label="Add note" onPress={() => demo('Add note')} />
          <Quick icon="message" label="Send intake" onPress={() => demo('Send intake form')} />
        </View>
      </ScrollView>
      <View style={styles.toolbar}>
        <Tool
          icon={call.isMuted ? 'micOff' : 'mic'}
          label={call.isMuted ? 'Muted' : 'Mute'}
          on={call.isMuted}
          onPress={actions.toggleMute}
        />
        <Tool
          icon="pause"
          label={held ? 'Resume' : 'Hold'}
          on={held}
          onPress={actions.toggleHold}
        />
        {audio.supported && (
          <Tool icon="volume" label="Speaker" on={audio.speakerOn} onPress={audio.toggleSpeaker} />
        )}
      </View>
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.bar, styles.barEnd, pressed && styles.pressed]}
          onPress={actions.hangup}
        >
          <Text style={styles.barText}>End call</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Tool(props: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={props.label}
      accessibilityState={{ selected: props.on }}
      style={({ pressed }) => [styles.tool, props.on && styles.toolOn, pressed && styles.pressed]}
      onPress={props.onPress}
    >
      <Icon name={props.icon} size={20} color={props.on ? '#fff' : colors.text} />
      <Text style={[styles.toolText, props.on && styles.toolTextOn]}>{props.label}</Text>
    </Pressable>
  );
}

function Quick(props: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickBtn, pressed && styles.pressed]}
      onPress={props.onPress}
    >
      <Icon name={props.icon} size={16} color={colors.accent} />
      <Text style={styles.quickText}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  error: { fontFamily: fonts.regular, color: colors.danger, paddingHorizontal: 16 },

  lineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineName: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  lineState: { fontFamily: fonts.medium, fontSize: 13, color: colors.subdued },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLive: { backgroundColor: '#fff' },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: radius,
    backgroundColor: colors.offset,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },

  list: { paddingHorizontal: 12, paddingBottom: 16 },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.subdued,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    marginBottom: 6,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSubdued,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },
  avatarLarge: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent },
  avatarTextLarge: { fontSize: 20, color: '#fff' },
  rowTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  rowMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.subdued },
  tag: {
    backgroundColor: colors.accentSubdued,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontFamily: fonts.medium, fontSize: 11, color: colors.accent },
  rowCall: {
    width: 36,
    height: 36,
    borderRadius: radius,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.success,
  },
  bannerRinging: { backgroundColor: colors.accent },
  bannerHeld: { backgroundColor: colors.subdued },
  bannerText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
  bannerTimer: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },

  body: { padding: 12 },
  chart: {
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  chartHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.offset,
  },
  chartName: { fontFamily: fonts.semibold, fontSize: 20, color: colors.text },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  factLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.subdued },
  factValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },

  quick: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickText: { fontFamily: fonts.medium, fontSize: 12, color: colors.accent },

  toolbar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tool: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: radius,
    backgroundColor: colors.offset,
  },
  toolOn: { backgroundColor: colors.accent },
  toolText: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  toolTextOn: { color: '#fff' },

  footer: { flexDirection: 'row', gap: 8, padding: 12 },
  bar: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius,
  },
  barOutline: { borderWidth: 1, borderColor: colors.danger },
  barAnswer: { backgroundColor: colors.success },
  barEnd: { backgroundColor: colors.danger },
  barText: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff' },
});
