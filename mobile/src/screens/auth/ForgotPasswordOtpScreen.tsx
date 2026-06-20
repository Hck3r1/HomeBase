import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthFormLayout } from '../../components/AuthFormLayout';
import { AuthErrorBanner } from '../../components/AuthErrorBanner';
import { InputGroup } from '../../components/InputGroup';
import { FieldLabel } from '../../components/FieldLabel';
import { OtpInput } from '../../components/OtpInput';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { theme } from '../../theme';
import { verifyResetOtp } from '../../lib/authApi';
import { getApiErrorMessage } from '../../lib/apiErrors';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPasswordOtp'>;

export function ForgotPasswordOtpScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { showToast } = useToast();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastShown, setToastShown] = useState(false);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (toastShown) return;
    showToast('An OTP has been sent to your email');
    setToastShown(true);
  }, [showToast, toastShown]);

  const verify = useCallback(
    async (code: string) => {
      if (code.length !== 6 || verifyingRef.current) return;
      verifyingRef.current = true;
      setError(null);
      setLoading(true);
      try {
        const result = await verifyResetOtp(email, code);
        navigation.navigate('ResetPassword', { email, resetToken: result.resetToken });
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        verifyingRef.current = false;
        setLoading(false);
      }
    },
    [email, navigation],
  );

  function handleOtpChange(next: string) {
    setOtp(next);
    if (next.length < 6) {
      setError(null);
      return;
    }
    void verify(next);
  }

  function goBack() {
    navigation.goBack();
  }

  return (
    <AuthFormLayout
      title="Enter your code"
      onBack={goBack}
      subtitle={
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{' '}
          <Text style={styles.email}>{email}</Text>. It expires in 10 minutes.
        </Text>
      }
    >
      <View style={styles.field}>
        <FieldLabel>Verification code</FieldLabel>
        <InputGroup>
          <View style={styles.otpWrap}>
            <OtpInput value={otp} onChange={handleOtpChange} disabled={loading} />
          </View>
        </InputGroup>
      </View>

      {error && <AuthErrorBanner message={error} />}

      <Button label="Verify code" onPress={() => void verify(otp)} loading={loading} disabled={loading || otp.length !== 6} />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: theme.colors.muted, fontSize: theme.font.sizeSm, textAlign: 'center', lineHeight: 20 },
  email: { color: theme.colors.ink, fontWeight: theme.font.weightSemibold },
  field: { marginBottom: theme.spacing(2) },
  otpWrap: { alignItems: 'center', paddingVertical: theme.spacing(2) },
});
