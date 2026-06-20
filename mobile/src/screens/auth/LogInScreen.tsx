import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { FieldLabel } from '../../components/FieldLabel';
import { AuthErrorBanner } from '../../components/AuthErrorBanner';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { PasswordInput } from '../../components/PasswordInput';
import { Button } from '../../components/Button';
import { OrDivider } from '../../components/OrDivider';
import { SocialButtons } from '../../components/SocialButtons';
import { useToast } from '../../components/Toast';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { login } from '../../lib/authApi';
import { getApiErrorMessage } from '../../lib/apiErrors';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'LogIn'>;

export function LogInScreen({ navigation }: Props) {
  const signIn = useAuthStore((s) => s.signIn);
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address');
    if (!password) return setError('Enter your password');

    setLoading(true);
    try {
      const session = await login(email, password);
      await signIn(session);
      showToast('Login successful');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormLayout
      title="Welcome back"
      subtitle={
        <Text style={styles.subtitle}>
          Don&apos;t have an account?{' '}
          <Text style={styles.link} onPress={() => navigation.replace('SignUp')}>
            Sign up
          </Text>
        </Text>
      }
    >
      <View style={styles.field}>
        <FieldLabel>Email</FieldLabel>
        <InputGroup>
          <AppTextInput
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />
        </InputGroup>
      </View>

      <View style={styles.field}>
        <FieldLabel>Password</FieldLabel>
        <InputGroup>
          <PasswordInput value={password} onChangeText={setPassword} placeholder="Your password" />
        </InputGroup>
        <Text style={styles.forgot} onPress={() => navigation.navigate('ForgotPassword')}>
          Forgot password?
        </Text>
      </View>

      {error && <AuthErrorBanner message={error} />}

      <Button label="Sign in" onPress={() => void submit()} loading={loading} disabled={loading} style={styles.submit} />

      <OrDivider />
      <SocialButtons onProvider={() => {}} />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: theme.colors.muted, fontSize: theme.font.sizeSm, textAlign: 'center', lineHeight: 20 },
  link: { color: theme.colors.primary, fontWeight: theme.font.weightBold },
  field: { marginBottom: theme.spacing(2) },
  forgot: {
    alignSelf: 'flex-end',
    color: theme.colors.primary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    marginTop: theme.spacing(1),
  },
  submit: { marginTop: theme.spacing(0.5) },
});
