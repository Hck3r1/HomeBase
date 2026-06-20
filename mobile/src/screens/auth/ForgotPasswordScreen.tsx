import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { FieldLabel } from '../../components/FieldLabel';
import { AuthErrorBanner } from '../../components/AuthErrorBanner';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { forgotPassword } from '../../lib/authApi';
import { getApiErrorMessage } from '../../lib/apiErrors';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function goBack() {
    navigation.goBack();
  }

  async function submit() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address');

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      navigation.navigate('ForgotPasswordOtp', { email: email.trim() });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormLayout
      title="Forgot password?"
      onBack={goBack}
      subtitle={
        <Text style={styles.subtitle}>
          Enter the email linked to your account and we&apos;ll send you a one-time code.
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

      {error && <AuthErrorBanner message={error} />}

      <Button label="Continue" onPress={() => void submit()} loading={loading} disabled={loading} />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: theme.colors.muted, fontSize: theme.font.sizeSm, textAlign: 'center', lineHeight: 20 },
  field: { marginBottom: theme.spacing(2) },
});
