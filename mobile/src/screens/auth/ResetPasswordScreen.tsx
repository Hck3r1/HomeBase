import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { FieldLabel } from '../../components/FieldLabel';
import { AuthErrorBanner } from '../../components/AuthErrorBanner';
import { InputGroup } from '../../components/InputGroup';
import { PasswordInput } from '../../components/PasswordInput';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { theme } from '../../theme';
import { resetPassword } from '../../lib/authApi';
import { getApiErrorMessage } from '../../lib/apiErrors';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { resetToken } = route.params;
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function goBack() {
    navigation.goBack();
  }

  async function submit() {
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');

    setLoading(true);
    try {
      await resetPassword(resetToken, password);
      showToast('Password updated successfully');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'LogIn' }],
        }),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormLayout
      title="New password"
      onBack={goBack}
      subtitle={
        <Text style={styles.subtitle}>Choose a strong password you haven&apos;t used before.</Text>
      }
    >
      <View style={styles.field}>
        <FieldLabel>New password</FieldLabel>
        <InputGroup>
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
          />
        </InputGroup>
      </View>

      <View style={styles.field}>
        <FieldLabel>Confirm password</FieldLabel>
        <InputGroup>
          <PasswordInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter your password"
          />
        </InputGroup>
      </View>

      {error && <AuthErrorBanner message={error} />}

      <Button label="Update password" onPress={() => void submit()} loading={loading} disabled={loading} />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: theme.colors.muted, fontSize: theme.font.sizeSm, textAlign: 'center', lineHeight: 20 },
  field: { marginBottom: theme.spacing(2) },
});
