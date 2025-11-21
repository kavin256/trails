import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

/**
 * Root stack parameter list defining all screens and their params
 */
export type RootStackParamList = {
  TripsList: undefined;
  TripDetails: { tripId: string };
  EditTrip: { tripId?: string };
};

/**
 * Navigation prop type for any screen in the root stack
 */
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Route prop type helper for specific screens
 */
export type RootStackRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;
