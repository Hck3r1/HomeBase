import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { FieldLabel } from '../../components/FieldLabel';
import { AuthErrorBanner } from '../../components/AuthErrorBanner';
import { AuthMessageModal } from '../../components/AuthMessageModal';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { PasswordInput } from '../../components/PasswordInput';
import { Button } from '../../components/Button';
import { OrDivider } from '../../components/OrDivider';
import { SocialButtons } from '../../components/SocialButtons';
import { TermsCheckbox } from '../../components/TermsCheckbox';
import { theme } from '../../theme';
import { register } from '../../lib/authApi';
import { getApiErrorMessage } from '../../lib/apiErrors';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');

  function closeVerifyModal() {
    setVerifyModalVisible(false);
    navigation.replace('LogIn');
  }

  async function submit() {
    setError(null);
    if (firstName.trim().length < 2) return setError('Enter your first name');
    if (lastName.trim().length < 2) return setError('Enter your last name');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (!agreed) return setError('Please accept the terms to continue');

    setLoading(true);
    try {
      const result = await register(`${firstName.trim()} ${lastName.trim()}`, email, password);
      setVerifyMessage(result.message);
      setVerifyModalVisible(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthFormLayout
        title="Create an account"
        subtitle={
          <Text style={styles.subtitle}>
            Already have an account?{' '}
            <Text style={styles.link} onPress={() => navigation.replace('LogIn')}>
              Log in
            </Text>
          </Text>
        }
      >
        <View style={styles.field}>
          <View style={styles.nameRow}>
            <View style={styles.nameCol}>
              <FieldLabel>First name</FieldLabel>
              <InputGroup>
                <AppTextInput
                  placeholder="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoComplete="given-name"
                  editable={!loading}
                />
              </InputGroup>
            </View>
            <View style={styles.nameCol}>
              <FieldLabel>Last name</FieldLabel>
              <InputGroup>
                <AppTextInput
                  placeholder="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoComplete="family-name"
                  editable={!loading}
                />
              </InputGroup>
            </View>
          </View>
        </View>

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
            <PasswordInput value={password} onChangeText={setPassword} placeholder="At least 8 characters" />
          </InputGroup>
        </View>

        <TermsCheckbox checked={agreed} onToggle={() => setAgreed((v) => !v)} />

        {error && <AuthErrorBanner message={error} />}

        <Button label="Sign up" onPress={() => void submit()} loading={loading} disabled={loading} />

        <OrDivider />
        <SocialButtons onProvider={() => {}} />
      </AuthFormLayout>

      <AuthMessageModal
        visible={verifyModalVisible}
        title="Check your email"
        message={
          verifyMessage ||
          'We sent you a verification link. Check your email to verify your account, then sign in to continue.'
        }
        actionLabel="Go to sign in"
        onClose={closeVerifyModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: theme.colors.muted, fontSize: theme.font.sizeSm, textAlign: 'center', lineHeight: 20 },
  link: { color: theme.colors.primary, fontWeight: theme.font.weightBold },
  field: { marginBottom: theme.spacing(2) },
  nameRow: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
});
