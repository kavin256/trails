import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Trip } from '../types/trip';
import * as TripRepository from '../db/tripRepository';

interface TripsContextValue {
  trips: Trip[];
  isLoading: boolean;
  getTripById: (id: string) => Trip | undefined;
  addTrip: (data: Omit<Trip, 'id' | 'updatedAt'>) => void;
  updateTrip: (id: string, data: Partial<Omit<Trip, 'id' | 'updatedAt'>>) => void;
  deleteTrip: (id: string) => void;
}

const TripsContext = createContext<TripsContextValue | undefined>(undefined);

// Initial dummy data for first-time setup
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
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize database and load trips on mount
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Initialize database and create tables
        await TripRepository.init();

        // Load existing trips
        const existingTrips = await TripRepository.getAllTrips();

        // If no trips exist, seed with initial data
        if (existingTrips.length === 0) {
          console.log('No trips found, seeding initial data...');
          for (const trip of INITIAL_TRIPS) {
            await TripRepository.insertTrip(trip);
          }
          setTrips(INITIAL_TRIPS);
        } else {
          setTrips(existingTrips);
        }
      } catch (error) {
        console.error('Error initializing database:', error);
        // Fallback to in-memory state if database fails
        setTrips(INITIAL_TRIPS);
      } finally {
        setIsLoading(false);
      }
    };

    initializeDatabase();
  }, []);

  const getTripById = (id: string): Trip | undefined => {
    return trips.find((trip) => trip.id === id);
  };

  const addTrip = (data: Omit<Trip, 'id' | 'updatedAt'>): void => {
    const newTrip: Trip = {
      ...data,
      id: Date.now().toString(),
      updatedAt: Date.now(),
    };

    // Save to database
    TripRepository.insertTrip(newTrip)
      .then(() => {
        // Update in-memory state on success
        setTrips((prev) => [newTrip, ...prev]);
      })
      .catch((error) => {
        console.error('Error adding trip:', error);
      });
  };

  const updateTrip = (
    id: string,
    data: Partial<Omit<Trip, 'id' | 'updatedAt'>>
  ): void => {
    // Find existing trip to merge with updates
    const existingTrip = trips.find((trip) => trip.id === id);
    if (!existingTrip) {
      console.error('Trip not found:', id);
      return;
    }

    const updatedTrip: Trip = {
      ...existingTrip,
      ...data,
      updatedAt: Date.now(),
    };

    // Save to database
    TripRepository.updateTrip(id, updatedTrip)
      .then(() => {
        // Update in-memory state on success
        setTrips((prev) =>
          prev.map((trip) => (trip.id === id ? updatedTrip : trip))
        );
      })
      .catch((error) => {
        console.error('Error updating trip:', error);
      });
  };

  const deleteTrip = (id: string): void => {
    // Delete from database
    TripRepository.deleteTrip(id)
      .then(() => {
        // Update in-memory state on success
        setTrips((prev) => prev.filter((trip) => trip.id !== id));
      })
      .catch((error) => {
        console.error('Error deleting trip:', error);
      });
  };

  const value: TripsContextValue = {
    trips,
    isLoading,
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
