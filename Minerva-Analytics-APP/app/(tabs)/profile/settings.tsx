import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { createMainStyles } from '../../../constants/main_st.styles';
import createSettingsStyles from './style/settingsStyle.style';
import { useTheme } from '../../../contexts/ThemeContext';
import { useUser, type UserProfile } from '../../../contexts/UserContext';
import { isFirebaseConfigured } from '../../../services/firebase';

const SUCCESS_TIMEOUT = 2500;

type ProfileFormState = Pick<UserProfile, 'fullName' | 'email' | 'role' | 'organization' | 'bio'>;

export default function SettingsScreen() {
  const { theme, colors, setTheme } = useTheme();
  const { profile, updateProfile } = useUser();
  const router = useRouter();

  const [form, setForm] = useState<ProfileFormState>({
    fullName: profile.fullName,
    email: profile.email,
    role: profile.role,
    organization: profile.organization,
    bio: profile.bio,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm({
      fullName: profile.fullName,
      email: profile.email,
      role: profile.role,
      organization: profile.organization,
      bio: profile.bio,
    });
  }, [profile]);

  const mainStyles = useMemo(() => createMainStyles(colors), [colors]);
  const settingsStyles = useMemo(() => createSettingsStyles(colors), [colors]);

  const handleChange = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await updateProfile(form);
      setFeedback('Cambios guardados correctamente.');
      setTimeout(() => setFeedback(null), SUCCESS_TIMEOUT);
      // Redirige de vuelta al perfil al guardar
      router.replace('/(tabs)/profile');
    } catch (error) {
      console.warn('Error al guardar el perfil', error);
      setErrorMessage('No se pudo guardar el perfil. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeToggle = (value: boolean) => {
    setTheme(value ? 'dark' : 'light');

  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={settingsStyles.content}
        style={{ flex: 1 }}
      >
      <View style={mainStyles.container}>
        <View style={[settingsStyles.section, settingsStyles.sectionFirst]}>
          <Text style={settingsStyles.sectionTitle}>Tema de la aplicacion</Text>
          <View style={settingsStyles.switchRow}>
            <View style={settingsStyles.switchCopy}>
              <Text style={settingsStyles.switchLabel}>Modo oscuro</Text>
              <Text style={settingsStyles.helper}>
                Activa un estilo optimizado para ambientes con poca luz.
              </Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={handleThemeToggle}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={theme === 'dark' ? colors.accentText : colors.surface}
              ios_backgroundColor={colors.border}
            />
          </View>
          <View style={settingsStyles.themeButtons}>
            <Pressable
              style={[settingsStyles.themeButton, theme === 'light' && settingsStyles.themeButtonActive]}
              onPress={() => setTheme('light')}
            >
              <Text style={settingsStyles.themeButtonText}>Claro</Text>
            </Pressable>
            <Pressable
              style={[settingsStyles.themeButton, theme === 'dark' && settingsStyles.themeButtonActive]}
              onPress={() => setTheme('dark')}
            >
              <Text style={settingsStyles.themeButtonText}>Oscuro</Text>
            </Pressable>
          </View>
        </View>

        <View style={settingsStyles.section}>
          <Text style={settingsStyles.sectionTitle}>Perfil</Text>
          {!isFirebaseConfigured ? (
            <Text style={settingsStyles.helperWarning}>
              Conecta tus credenciales de Firebase en app.config.ts para sincronizar y respaldar tu perfil en la nube.
            </Text>
          ) : null}
          <View style={settingsStyles.field}>
            <Text style={settingsStyles.label}>Nombre completo</Text>
            <TextInput
              value={form.fullName}
              onChangeText={(value) => handleChange('fullName', value)}
              placeholder='Ej: Benjamin Contreras'
              placeholderTextColor={colors.textMuted}
              style={settingsStyles.input}
            />
          </View>
          <View style={settingsStyles.field}>
            <Text style={settingsStyles.label}>Correo electronico</Text>
            <TextInput
              value={form.email}
              onChangeText={(value) => handleChange('email', value)}
              keyboardType='email-address'
              autoCapitalize='none'
              placeholder='tu@correo.cl'
              placeholderTextColor={colors.textMuted}
              style={settingsStyles.input}
            />
          </View>
          <View style={settingsStyles.field}>
            <Text style={settingsStyles.label}>Cargo</Text>
            <TextInput
              value={form.role}
              onChangeText={(value) => handleChange('role', value)}
              placeholder='Ej: Analista de datos'
              placeholderTextColor={colors.textMuted}
              style={settingsStyles.input}
            />
          </View>
          <View style={settingsStyles.field}>
            <Text style={settingsStyles.label}>Organizacion</Text>
            <TextInput
              value={form.organization}
              onChangeText={(value) => handleChange('organization', value)}
              placeholder='Ej: Minerva Analytics'
              placeholderTextColor={colors.textMuted}
              style={settingsStyles.input}
            />
          </View>
          <View style={settingsStyles.field}>
            <Text style={settingsStyles.label}>Biografia</Text>
            <TextInput
              value={form.bio}
              onChangeText={(value) => handleChange('bio', value)}
              placeholder='Cuenta en que estas trabajando ahora.'
              placeholderTextColor={colors.textMuted}
              style={[settingsStyles.input, settingsStyles.textarea]}
              multiline
            />
          </View>
        </View>

        <Pressable
          style={[settingsStyles.saveButton, isSaving && settingsStyles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={settingsStyles.saveButtonText}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Text>
        </Pressable>
        {feedback ? <Text style={settingsStyles.feedback}>{feedback}</Text> : null}
        {errorMessage ? <Text style={settingsStyles.error}>{errorMessage}</Text> : null}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

