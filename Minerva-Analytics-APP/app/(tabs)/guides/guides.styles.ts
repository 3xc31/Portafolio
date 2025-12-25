import { StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../constants/theme';

export const createGuidesStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    popupCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      width: '100%',
      maxWidth: 720,
      padding: 16,
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    popupTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },
    paragraph: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 22,
      textAlign: 'justify',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    headerSide: {
      width: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleContainer: {
      flex: 1,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleButton: {
      flex: 1,
      paddingRight: 12,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.accentMuted,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      backgroundColor: colors.chipBackground,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    chipText: {
      color: colors.chipText,
      fontSize: 12,
    },
    importanceText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 16,
      marginBottom: 12,
    },
  });

export const GUIDE_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

export type GuidesStyles = ReturnType<typeof createGuidesStyles>;
export default createGuidesStyles;



