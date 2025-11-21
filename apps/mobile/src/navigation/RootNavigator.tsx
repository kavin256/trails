import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { TripsListScreen } from '../screens/TripsListScreen';
import { TripDetailsScreen } from '../screens/TripDetailsScreen';
import { EditTripScreen } from '../screens/EditTripScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="TripsList"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="TripsList"
        component={TripsListScreen}
        options={{
          title: 'Trails',
        }}
      />
      <Stack.Screen
        name="TripDetails"
        component={TripDetailsScreen}
        options={{
          title: 'Trip Details',
        }}
      />
      <Stack.Screen
        name="EditTrip"
        component={EditTripScreen}
        options={({ route }) => ({
          title: route.params?.tripId ? 'Edit Trip' : 'New Trip',
        })}
      />
    </Stack.Navigator>
  );
};
