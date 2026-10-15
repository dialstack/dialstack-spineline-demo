import { Pressable, StyleSheet, View } from 'react-native';
import { Softphone } from '@dialstack/sdk-native';

import { CustomSoftphone } from '../../components/CustomSoftphone';
import { Screen } from '../../components/Screen';
import { Icon, type IconName } from '../../components/TabIcon';
import { colors, radius } from '../../theme';
import { useUiMode, type UiMode } from '../../uiMode';

const MODES: { mode: UiMode; icon: IconName; label: string }[] = [
  { mode: 'drop-in', icon: 'box', label: 'Drop-in UI: the SDK’s <Softphone />' },
  { mode: 'custom', icon: 'brush', label: 'Custom UI: Spineline’s screens on useSoftphone()' },
];

/**
 * The same provider, connection and call, drawn either by the SDK or by the
 * app. The switch is kept small on purpose: it is for the presenter, and How it
 * works explains what it changes.
 */
export default function Phone() {
  const [mode, setMode] = useUiMode();
  return (
    <Screen
      title="Phone"
      right={
        <View style={styles.toggle}>
          {MODES.map((m) => (
            <Pressable
              key={m.mode}
              accessibilityRole="button"
              accessibilityLabel={m.label}
              accessibilityState={{ selected: mode === m.mode }}
              hitSlop={6}
              style={[styles.option, mode === m.mode && styles.optionActive]}
              onPress={() => setMode(m.mode)}
            >
              <Icon
                name={m.icon}
                size={16}
                color={mode === m.mode ? colors.accent : colors.subdued}
              />
            </Pressable>
          ))}
        </View>
      }
    >
      <View style={styles.surface}>{mode === 'drop-in' ? <Softphone /> : <CustomSoftphone />}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: radius,
    backgroundColor: colors.border,
  },
  option: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius - 2 },
  optionActive: { backgroundColor: colors.surface },
  surface: {
    flex: 1,
    margin: 16,
    marginTop: 4,
    borderRadius: radius * 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
});
