import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { createMainStyles } from '../../../constants/main_st.styles';
import type { ThemeColors } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useUser } from '../../../contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { auth, isFirebaseConfigured } from '../../../services/firebase';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { profile, stats } = useUser();
  const signOut = useAuth().signOut;
  const router = useRouter();

  const mainStyles = useMemo(() => createMainStyles(colors), [colors]);
  const profileStyles = useMemo(() => createProfileStyles(colors), [colors]);

  const formattedMemberSince = useMemo(() => {
    const value = profile.memberSince as any;
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    try {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
    } catch (e) {
      const months = [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre',
      ];
      const dd = String(date.getUTCDate()).padStart(2, '0');
      const mm = months[date.getUTCMonth()] ?? '';
      const yyyy = date.getUTCFullYear();
      return `${dd} de ${mm} de ${yyyy}`;
    }
  }, [profile.memberSince]);

  return (
    <ScrollView contentContainerStyle={profileStyles.content}>
      <View style={mainStyles.container}>
        <View style={profileStyles.header}>
          <View style={profileStyles.avatar}>
            <Text style={profileStyles.avatarText}>{profile.initials}</Text>
          </View>
          <View style={profileStyles.headerCopy}>
            <Text
              style={[mainStyles.title, profileStyles.userName]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {profile.fullName}
            </Text>
            <Text
              style={[profileStyles.muted, profileStyles.truncate]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {profile.email}
            </Text>
            <Text
              style={profileStyles.truncate}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
            <Text style={profileStyles.muted}>{profile.role} · {profile.organization}</Text>
            </Text>
          </View>
        </View>

        <View style={profileStyles.card}>
          <Text style={profileStyles.cardTitle}>Actividad</Text>
          <View style={profileStyles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={profileStyles.stat}>
                <Text style={profileStyles.statValue}>{stat.value}</Text>
                <Text style={profileStyles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={profileStyles.card}>
          <Text style={profileStyles.cardTitle}>Acerca de</Text>
          <Text style={profileStyles.muted}>{profile.bio}</Text>
          <Text style={profileStyles.meta}>Miembro desde {formattedMemberSince}</Text>
        </View>

        <View style={profileStyles.card}>
          <Text style={profileStyles.cardTitle}>Acciones rapidas</Text>
          <Pressable
            style={profileStyles.buttonSecondary}
            onPress={() => router.push('/(tabs)/profile/settings')}
          >
            <Text style={profileStyles.buttonSecondaryText}>Editar perfil</Text>
          </Pressable>
          {/* <Pressable style={profileStyles.buttonSecondary}>
            <Text style={profileStyles.buttonSecondaryText}>Configurar notificaciones</Text>
          </Pressable> */}
          {/* <Pressable
            style={profileStyles.buttonSecondary}
            onPress={async () => {
              try {
                if (!isFirebaseConfigured || !auth) {
                  console.warn('Firebase no está configurado o Auth no inicializado.');
                  return;
                }
                const user = auth.currentUser;
                if (!user) {
                  console.warn('No hay un usuario autenticado en este momento.');
                  return;
                }
                const token = await user.getIdToken();
                console.log('Firebase ID Token:', token);
              } catch (e) {
                console.warn('Error obteniendo el ID token:', e);
              }
            }}
          >
            <Text style={profileStyles.buttonSecondaryText}>Obtener token (debug)</Text>
          </Pressable> */}
          <Pressable style={[profileStyles.buttonSecondary, profileStyles.logout]}
            onPress={() => signOut()}
          >
            <Text style={profileStyles.buttonSecondaryText}>Cerrar sesion</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const createProfileStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      paddingBottom: 48,
      flexGrow: 1,
      backgroundColor: colors.background,
      gap: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 32,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: colors.accentText,
      fontSize: 32,
      fontWeight: '700',
    },
    headerCopy: {
      gap: 4,
      flex: 1,
      minWidth: 0,
    },
    userName: {
      flexShrink: 1,
      maxWidth: '100%',
    },
    truncate: {
      flexShrink: 1,
      maxWidth: '100%',
    },
    muted: {
      color: colors.textMuted,
      fontSize: 14,
    },
    meta: {
      color: colors.textMuted,
      fontSize: 13,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 12,
      marginTop: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    stat: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 13,
    },
    buttonSecondary: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.accentMuted,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    buttonSecondaryText: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: '500',
    },
    logout: {
      borderColor: colors.negative,
    },
  });
