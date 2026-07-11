export default ({ config }: { config: any }) => ({
  ...config,
  
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://sijumantik.my.id/api',
    ...config.extra
  },
});
