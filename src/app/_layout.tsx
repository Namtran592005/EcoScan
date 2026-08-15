import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Hướng dẫn & thông tin',
            headerStyle: { backgroundColor: Colors.bg },
            headerTintColor: Colors.text,
            headerTitleStyle: { color: Colors.text },
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}