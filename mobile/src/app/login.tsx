import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '../auth';
import { UnauthorizedError } from '../spineline';
import { colors, fonts, radius, useBrandFonts } from '../theme';

/** Same sign-in as the web app's form (`app/(auth)/login/form.tsx`): same account, same password. */
export default function Login() {
  const { signedIn, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fontsReady = useBrandFonts();

  if (signedIn) return <Redirect href="/" />;
  if (!fontsReady) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof UnauthorizedError ? 'Invalid email or password' : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Image
          source={require('../../assets/images/spineline-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Sign in to your practice</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@practice.com"
          placeholderTextColor={colors.subdued}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          onSubmitEditing={submit}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [styles.button, (pressed || busy) && styles.buttonPressed]}
          onPress={submit}
          disabled={busy || !email || !password}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.offset },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius * 2,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logo: { width: '70%', height: 56, alignSelf: 'center', marginBottom: 24 },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.subdued, marginBottom: 6 },
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  error: { fontFamily: fonts.regular, color: colors.danger, marginBottom: 12 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { fontFamily: fonts.semibold, color: '#fff', fontSize: 16 },
});
