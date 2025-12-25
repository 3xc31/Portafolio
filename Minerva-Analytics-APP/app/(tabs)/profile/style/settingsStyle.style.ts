import { StyleSheet } from 'react-native';
import { ThemeColors } from "../../../../constants/theme";

const createSettingsStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      paddingBottom: 64,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
    backLink: {
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    backLinkText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '500',
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
      //marginTop: 24,
    },
    sectionFirst: {
      //marginTop: 32,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    switchCopy: {
      flex: 1,
      gap: 4,
    },
    switchLabel: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    helper: {
      color: colors.textMuted,
      fontSize: 13,
    },
    helperWarning: {
      color: colors.negative,
      fontSize: 13,
      lineHeight: 18,
    },
    themeButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    themeButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    themeButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentMuted,
    },
    themeButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    field: {
      gap: 8,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.inputText,
      fontSize: 16,
    },
    textarea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    saveButton: {
      marginTop: 32,
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: colors.accentText,
      fontSize: 16,
      fontWeight: '700',
    },
    feedback: {
      marginTop: 12,
      color: colors.accent,
      fontSize: 14,
      textAlign: 'center',
    },
    error: {
      marginTop: 8,
      color: colors.negative,
      fontSize: 14,
      textAlign: 'center',
    },
  });

export default createSettingsStyles;
