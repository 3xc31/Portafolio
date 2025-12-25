import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';

import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUser } from '../../contexts/UserContext';
import { auth, isFirebaseConfigured } from '../../services/firebase';
import { fetchSignInMethodsForEmail } from 'firebase/auth';

export default function SignUpScreen() {
  const { colors } = useTheme();
  const { signUp } = useAuth();
  const { updateProfile } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Live validation state
  const emailTrimmed = email.trim();
  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i, []);
  const emailValid = emailRegex.test(emailTrimmed);
  const [emailTaken, setEmailTaken] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const hasMinLen = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const pwdStrong = hasMinLen && hasLower && hasUpper && hasDigit && hasSpecial;

  // Debounced email availability check
  useEffect(() => {
    let timer: any;
    if (isFirebaseConfigured && auth && emailValid) {
      setCheckingEmail(true);
      setEmailTaken(null);
      timer = setTimeout(async () => {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, emailTrimmed);
          setEmailTaken((methods && methods.length > 0) || false);
        } catch {
          setEmailTaken(null); // indeterminado
        } finally {
          setCheckingEmail(false);
        }
      }, 500);
    } else {
      setCheckingEmail(false);
      setEmailTaken(null);
    }
    return () => timer && clearTimeout(timer);
  }, [emailTrimmed, emailValid]);

  const onRegister = async () => {
    setError(null);
    const name = fullName.trim();
    const emailT = emailTrimmed;
    if (!name) {
      setError('Por favor, ingresa tu nombre.');
      return;
    }
    if (!emailT) {
      setError('Por favor, ingresa un email válido.');
      return;
    }
    if (!emailRegex.test(emailT)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!password) {
      setError('Por favor, ingresa una contraseña.');
      return;
    }
    if (!pwdStrong) {
      setError('La contraseña debe tener mínimo 8 caracteres, con al menos 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (emailTaken === true) {
      setError('El correo electrónico ya está registrado.');
      return;
    }
    try {
      setLoading(true);
      // Última comprobación (por si cambió mientras escribía)
      if (isFirebaseConfigured && auth && emailValid) {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, emailT);
          if (methods && methods.length > 0) {
            setError('El correo electrónico ya está registrado.');
            setLoading(false);
            return;
          }
        } catch {}
      }

      await signUp(emailT, password);
      const now = new Date();
      const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const memberSince = `${months[now.getMonth()]} ${now.getFullYear()}`;
      await updateProfile({ fullName: name, email: emailT, memberSince });
    } catch (e: any) {
      const code = e?.code || '';
      if (typeof code === 'string' && code.includes('email-already-in-use')) {
        setError('El correo electrónico ya está registrado.');
      } else if (typeof code === 'string' && code.includes('weak-password')) {
        setError('La contraseña no cumple los requisitos de seguridad.');
      } else {
        setError('No se pudo crear la cuenta. Verifica tus datos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
      >
      <Text style={[styles.title, { color: colors.text }]}>Crear cuenta</Text>

      <TextInput
        placeholder="Nombre completo"
        placeholderTextColor={colors.textMuted}
        value={fullName}
        onChangeText={setFullName}
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        autoCapitalize="words"
      />

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {emailTrimmed.length > 0 && (
        <Text style={{ color: emailValid ? (emailTaken ? colors.negative : colors.positive) : colors.negative, width: '100%', marginTop: -8, marginBottom: 8, fontSize: 12 }}>
          {checkingEmail && emailValid ? 'Comprobando correo…' : emailValid ? (emailTaken ? 'El correo ya está registrado' : 'Correo válido') : 'Correo inválido'}
        </Text>
      )}

      <TextInput
        placeholder="Contraseña"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        secureTextEntry
      />
      <View style={{ width: '100%', marginTop: -6, marginBottom: 8 }}>
        <Text style={{ color: hasMinLen ? colors.positive : colors.textMuted, fontSize: 12 }}>• 8 caracteres mínimo</Text>
        <Text style={{ color: hasLower ? colors.positive : colors.textMuted, fontSize: 12 }}>• 1 letra minúscula</Text>
        <Text style={{ color: hasUpper ? colors.positive : colors.textMuted, fontSize: 12 }}>• 1 letra mayúscula</Text>
        <Text style={{ color: hasDigit ? colors.positive : colors.textMuted, fontSize: 12 }}>• 1 número</Text>
        <Text style={{ color: hasSpecial ? colors.positive : colors.textMuted, fontSize: 12 }}>• 1 carácter especial</Text>
      </View>

      <TextInput
        placeholder="Confirmar contraseña"
        placeholderTextColor={colors.textMuted}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        secureTextEntry
      />

      {error ? (
        <Text style={{ color: colors.negative, width: '100%', marginBottom: 8 }}>{error}</Text>
      ) : null}

      <Pressable
        onPress={onRegister}
        disabled={loading || !emailValid || !pwdStrong || (emailTaken === true)}
        style={[styles.button, { backgroundColor: colors.accent, opacity: (loading || !emailValid || !pwdStrong || (emailTaken === true)) ? 0.7 : 1 }]}
      >
        {loading ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.accentText }]}>Registrarme</Text>
        )}
      </Pressable>

      <Text style={{ color: colors.textMuted, marginTop: 16 }}>
        ¿Ya tienes cuenta?{' '}
        <Link href={"/(auth)/sign-in" as never} style={{ color: colors.tint }}>
          Inicia sesión
        </Link>
      </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
