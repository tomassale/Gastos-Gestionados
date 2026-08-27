import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ExpensesProvider } from '@/contexts/expenses-context';
import { HouseholdProvider } from '@/contexts/household-context';
import { PeopleProvider } from '@/contexts/people-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSync } from '@/hooks/use-sync';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Mantiene la sincronización andando mientras la app está abierta, sin
 * importar en qué pantalla esté el usuario.
 */
function SyncAgent() {
  useSync();
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <HouseholdProvider>
      <PeopleProvider>
        <ExpensesProvider>
          <SyncAgent />
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="expense-form"
                options={{ presentation: 'modal', title: 'Gasto' }}
              />
              <Stack.Screen name="people" options={{ presentation: 'modal', title: 'Personas' }} />
              <Stack.Screen
                name="household"
                options={{ presentation: 'modal', title: 'Hogar compartido' }}
              />
            </Stack>
            <StatusBar style="light" />
          </ThemeProvider>
        </ExpensesProvider>
      </PeopleProvider>
    </HouseholdProvider>
  );
}
