import { StyleSheet } from 'react-native';

import type { ThemeColors } from './theme';

export const createMainStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      gap: 15,
      paddingTop: 24,
    },
    contentContainer: {
      paddingBottom: 32,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '600',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 16,
    },
    list: {
      gap: 12,
    },
    listItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    symbol: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
    change: {
      fontSize: 16,
      fontWeight: '500',
    },
    positive: {
      color: colors.positive,
    },
    negative: {
      color: colors.negative,
    },
    company: {
      color: colors.textMuted,
      fontSize: 14,
    },
    meta: {
      color: colors.textMuted,
      fontSize: 12,
    },
    button: {
      marginTop: 'auto',
      fontSize: 18,
      textDecorationLine: 'underline',
      color: colors.accent,
      alignSelf: 'center',
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '600',
      marginTop: 8,
    },
    tickerSection: {
      marginBottom: 12,
    },
    marqueeContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    marqueeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginRight: 16,
    },
    tickerSymbol: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    tickerReturn: {
      color: colors.positive,
      fontSize: 16,
      fontWeight: '700',
    },
    tickerSeparator: {
      color: colors.textMuted,
      marginLeft: 6,
      marginRight: 6,
    },
    tickerLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    tickerLoadingText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    tickerErrorText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    stepsContainer: {
      marginTop: 12,
      gap: 12,
    },
    stepCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    stepTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    stepDescription: {
      color: colors.textMuted,
      fontSize: 14,
    },
    // Carousel de noticias
    newsCarousel: {
      // el ScrollView horizontal hereda el padding del contenedor
      paddingVertical: 4,
      paddingRight: 24, // para que el último item no quede pegado al borde
    },
    newsCarouselCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 10,
      elevation: 1,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    newsCarouselImage: {
      width: '100%',
      height: 140,
    },
    newsCarouselContent: {
      padding: 14,
      gap: 4,
    },
    newsCarouselTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    newsDescription: {
      color: colors.text,
      fontSize: 13.5,
      lineHeight: 18,
    },
    newsDots: {
      flexDirection: 'row',
      alignSelf: 'center',
      marginTop: 8,
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: {
      backgroundColor: colors.accent,
    },
    newsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    newsCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      width: '48%',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      // subtle shadow (Android)
      elevation: 2,
      // subtle shadow (iOS/web)
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    newsImage: {
      width: '100%',
      height: 128,
    },
    newsCardContent: {
      padding: 12,
      gap: 4,
    },
    newsTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    newsSource: {
      color: colors.textMuted,
      fontSize: 12,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      color: colors.textMuted,
      marginTop: 8,
    },
    spacerBottom: {
      height: 64,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      height: 56,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalHeaderSide: {
      width: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      flex: 1,
    },
    webView: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export type MainStyles = ReturnType<typeof createMainStyles>;
