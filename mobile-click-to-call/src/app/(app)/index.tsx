import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useClickToCall } from '../../clickToCall';
import { CallPanel } from '../../components/CallPanel';
import { CellCard } from '../../components/CellCard';
import { Console } from '../../components/Console';
import { Screen } from '@spineline/components/Screen';
import { formatForDisplay } from '@c2c/phone';
import { colors, fonts } from '../../theme';

/**
 * The app's softphone. Until the user has given their cell there is only the
 * setup; after that, the console to place a call and, once placed, the call.
 */
export default function Phone() {
  const { call, profile } = useClickToCall();
  const [editing, setEditing] = useState(false);
  const mobile = profile?.number ?? null;

  if (!mobile || editing) {
    return (
      <Screen title="Phone" subtitle="Calls ring your cell first">
        <View style={styles.content}>
          <CellCard />
          {mobile ? (
            <Pressable onPress={() => setEditing(false)} hitSlop={8}>
              <Text style={styles.link}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Phone"
      subtitle={`Rings your cell ${formatForDisplay(mobile)}`}
      right={
        <Pressable onPress={() => setEditing(true)} hitSlop={8}>
          <Text style={styles.link}>Edit</Text>
        </Pressable>
      }
    >
      <View style={styles.content}>{call ? <CallPanel call={call} /> : <Console />}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  link: { fontFamily: fonts.semibold, color: colors.accent },
});
