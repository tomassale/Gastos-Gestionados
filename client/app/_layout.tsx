import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ExpensesProvider } from '@/contexts/expenses-context';
import { HouseholdProvider } from '@/contexts/household-context';
import { PeopleProvider } from '@/contexts/people-context';
import { SyncProvider } from '@/contexts/sync-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <HouseholdProvider>
      <PeopleProvider>
        <ExpensesProvider>
          <SyncProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="expense-form"
                  options={{ presentation: 'modal', title: 'Gasto' }}
                />
              </Stack>
              <StatusBar style="light" />
            </ThemeProvider>
          </SyncProvider>
        </ExpensesProvider>
      </PeopleProvider>
    </HouseholdProvider>
  );
}
