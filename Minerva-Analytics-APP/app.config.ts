import type { ConfigContext, ExpoConfig } from 'expo/config';
import googleServices from './google-services.json';

type FirebaseConfigRecord = Record<string, string>;

const ensureString = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : undefined);

const buildFirebaseConfig = (): FirebaseConfigRecord => {
  const projectInfo = googleServices.project_info ?? {};
  const androidClient = googleServices.client?.[0];

  const firebaseEntries: Array<[string, string | undefined]> = [
    ['apiKey', ensureString(androidClient?.api_key?.[0]?.current_key)],
    ['appId', ensureString(androidClient?.client_info?.mobilesdk_app_id)],
    ['projectId', ensureString(projectInfo.project_id)],
    ['storageBucket', ensureString(projectInfo.storage_bucket)],
    ['messagingSenderId', ensureString(projectInfo.project_number)],
    [
      'authDomain',
      ensureString(projectInfo.project_id ? `${projectInfo.project_id}.firebaseapp.com` : undefined),
    ],
  ];

  return firebaseEntries.reduce<FirebaseConfigRecord>((acc, [key, value]) => {
    if (value) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectInfo = googleServices.project_info ?? {};
  const androidClient = googleServices.client?.[0];
  const firebaseConfig = buildFirebaseConfig();

  const adaptiveIcon = {
    backgroundColor: '#E6F4FE',
    foregroundImage: './assets/images/android-icon-foreground.png',
    backgroundImage: './assets/images/android-icon-background.png',
    monochromeImage: './assets/images/android-icon-monochrome.png',
    ...config.android?.adaptiveIcon,
  };

  const appEnvironment = process.env.APP_ENV ?? config.extra?.appEnvironment ?? 'development';

  const extra = {
    ...config.extra,
    firebase: firebaseConfig,
    firebaseProjectId: ensureString(projectInfo.project_id),
    firebaseProjectNumber: ensureString(projectInfo.project_number),
    firebaseStorageBucket: ensureString(projectInfo.storage_bucket),
    appEnvironment,
  };

  const plugins: Required<ExpoConfig>['plugins'] = [
    ...(config.plugins ?? []).filter((plugin) => {
      const name = Array.isArray(plugin) ? plugin[0] : plugin;
      return name !== 'expo-router' && name !== 'expo-splash-screen';
    }),
    'expo-router',
    [
      'expo-notifications',
      {
        icon: './assets/images/android-icon-monochrome.png',
        color: '#2196F3',
        mode: 'production',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
  ];

  const experiments = {
    ...config.experiments,
    typedRoutes: true,
    reactCompiler: true,
  };

  return {
    ...config,
    name: 'Minerva Analytics',
    slug: 'Minerva-Analytics',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'minervaanalytics',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      ...config.ios,
      supportsTablet: true,
    },
    android: {
      ...config.android,
      googleServicesFile: './google-services.json',
      package:
        ensureString(androidClient?.client_info?.android_client_info?.package_name) ?? config.android?.package,
      adaptiveIcon,
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      ...config.web,
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins,
    experiments,
    extra,
  };
};
