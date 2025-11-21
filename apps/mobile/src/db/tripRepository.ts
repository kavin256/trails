import * as SQLite from 'expo-sqlite';
import type { Trip } from '../types/trip';

const DB_NAME = 'trails.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create the database instance
 */
const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
  }
  return db;
};

/**
 * Initialize the database and create tables if they don't exist
 */
export const init = async (): Promise<void> => {
  try {
    const database = getDatabase();

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        destination TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        notes TEXT,
        updatedAt INTEGER NOT NULL
      );
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

/**
 * Get all trips from the database
 */
export const getAllTrips = async (): Promise<Trip[]> => {
  try {
    const database = getDatabase();
    const result = await database.getAllAsync<Trip>(
      'SELECT * FROM trips ORDER BY updatedAt DESC'
    );

    return result.map(mapRowToTrip);
  } catch (error) {
    console.error('Error getting all trips:', error);
    return [];
  }
};

/**
 * Get a single trip by ID
 */
export const getTripById = async (id: string): Promise<Trip | null> => {
  try {
    const database = getDatabase();
    const result = await database.getFirstAsync<Trip>(
      'SELECT * FROM trips WHERE id = ?',
      [id]
    );

    return result ? mapRowToTrip(result) : null;
  } catch (error) {
    console.error('Error getting trip by ID:', error);
    return null;
  }
};

/**
 * Insert a new trip into the database
 */
export const insertTrip = async (trip: Trip): Promise<void> => {
  try {
    const database = getDatabase();

    await database.runAsync(
      `INSERT INTO trips (id, title, destination, startDate, endDate, notes, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        trip.id,
        trip.title,
        trip.destination,
        trip.startDate,
        trip.endDate,
        trip.notes || null,
        trip.updatedAt,
      ]
    );

    console.log('Trip inserted successfully:', trip.id);
  } catch (error) {
    console.error('Error inserting trip:', error);
    throw error;
  }
};

/**
 * Update an existing trip in the database
 */
export const updateTrip = async (id: string, trip: Trip): Promise<void> => {
  try {
    const database = getDatabase();

    await database.runAsync(
      `UPDATE trips
       SET title = ?, destination = ?, startDate = ?, endDate = ?, notes = ?, updatedAt = ?
       WHERE id = ?`,
      [
        trip.title,
        trip.destination,
        trip.startDate,
        trip.endDate,
        trip.notes || null,
        trip.updatedAt,
        id,
      ]
    );

    console.log('Trip updated successfully:', id);
  } catch (error) {
    console.error('Error updating trip:', error);
    throw error;
  }
};

/**
 * Delete a trip from the database
 */
export const deleteTrip = async (id: string): Promise<void> => {
  try {
    const database = getDatabase();

    await database.runAsync('DELETE FROM trips WHERE id = ?', [id]);

    console.log('Trip deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
};

/**
 * Map a database row to a Trip object
 */
const mapRowToTrip = (row: any): Trip => {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    startDate: row.startDate,
    endDate: row.endDate,
    notes: row.notes || undefined,
    updatedAt: row.updatedAt,
  };
};
