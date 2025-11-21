import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from './src/navigation/RootNavigator';
import { TripsProvider } from './src/context/TripsContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TripsProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </TripsProvider>
    </GestureHandlerRootView>
  );
}
