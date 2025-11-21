import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Trip } from '../types/trip';

interface TripsContextValue {
  trips: Trip[];
  getTripById: (id: string) => Trip | undefined;
  addTrip: (data: Omit<Trip, 'id' | 'updatedAt'>) => void;
  updateTrip: (id: string, data: Partial<Omit<Trip, 'id' | 'updatedAt'>>) => void;
  deleteTrip: (id: string) => void;
}

const TripsContext = createContext<TripsContextValue | undefined>(undefined);

// Initial dummy data
const INITIAL_TRIPS: Trip[] = [
  {
    id: '1',
    title: 'Summer Vacation',
    destination: 'Bali, Indonesia',
    startDate: '2025-07-15',
    endDate: '2025-07-25',
    notes: 'Beach resort and temple tours',
    updatedAt: Date.now() - 86400000 * 7, // 7 days ago
  },
  {
    id: '2',
    title: 'Business Trip',
    destination: 'New York, USA',
    startDate: '2025-08-10',
    endDate: '2025-08-13',
    notes: 'Tech conference downtown',
    updatedAt: Date.now() - 86400000 * 3, // 3 days ago
  },
  {
    id: '3',
    title: 'Weekend Getaway',
    destination: 'Portland, Oregon',
    startDate: '2025-09-05',
    endDate: '2025-09-07',
    updatedAt: Date.now() - 86400000, // 1 day ago
  },
];

interface TripsProviderProps {
  children: ReactNode;
}

export const TripsProvider: React.FC<TripsProviderProps> = ({ children }) => {
  const [trips, setTrips] = useState<Trip[]>(INITIAL_TRIPS);

  const getTripById = (id: string): Trip | undefined => {
    return trips.find((trip) => trip.id === id);
  };

  const addTrip = (data: Omit<Trip, 'id' | 'updatedAt'>): void => {
    const newTrip: Trip = {
      ...data,
      id: Date.now().toString(),
      updatedAt: Date.now(),
    };
    setTrips((prev) => [newTrip, ...prev]);
  };

  const updateTrip = (
    id: string,
    data: Partial<Omit<Trip, 'id' | 'updatedAt'>>
  ): void => {
    setTrips((prev) =>
      prev.map((trip) =>
        trip.id === id
          ? { ...trip, ...data, updatedAt: Date.now() }
          : trip
      )
    );
  };

  const deleteTrip = (id: string): void => {
    setTrips((prev) => prev.filter((trip) => trip.id !== id));
  };

  const value: TripsContextValue = {
    trips,
    getTripById,
    addTrip,
    updateTrip,
    deleteTrip,
  };

  return (
    <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
  );
};

/**
 * Custom hook to access trips context
 * Throws an error if used outside of TripsProvider
 */
export const useTrips = (): TripsContextValue => {
  const context = useContext(TripsContext);
  if (context === undefined) {
    throw new Error('useTrips must be used within a TripsProvider');
  }
  return context;
};
