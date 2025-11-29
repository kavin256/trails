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
        updatedAt INTEGER NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Add deleted column to existing databases (best-effort migration)
    try {
      await database.execAsync(`
        ALTER TABLE trips ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
      `);
    } catch (error) {
      // Column may already exist; ignore error
      console.log('Info: "deleted" column may already exist');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

/**
 * Get all non-deleted trips from the database (for UI display)
 */
export const getAllTrips = async (): Promise<Trip[]> => {
  try {
    const database = getDatabase();
    const result = await database.getAllAsync<Trip>(
      'SELECT * FROM trips WHERE deleted = 0 ORDER BY updatedAt DESC'
    );

    return result.map(mapRowToTrip);
  } catch (error) {
    console.error('Error getting all trips:', error);
    return [];
  }
};

/**
 * Get all trips including deleted ones (for sync purposes)
 */
export const getAllTripsForSync = async (): Promise<Trip[]> => {
  try {
    const database = getDatabase();
    const result = await database.getAllAsync<Trip>(
      'SELECT * FROM trips ORDER BY updatedAt DESC'
    );

    return result.map(mapRowToTrip);
  } catch (error) {
    console.error('Error getting all trips for sync:', error);
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
      `INSERT INTO trips (id, title, destination, startDate, endDate, notes, updatedAt, deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trip.id,
        trip.title,
        trip.destination,
        trip.startDate,
        trip.endDate,
        trip.notes || null,
        trip.updatedAt,
        trip.deleted ? 1 : 0,
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
       SET title = ?, destination = ?, startDate = ?, endDate = ?, notes = ?, updatedAt = ?, deleted = ?
       WHERE id = ?`,
      [
        trip.title,
        trip.destination,
        trip.startDate,
        trip.endDate,
        trip.notes || null,
        trip.updatedAt,
        trip.deleted ? 1 : 0,
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
 * Soft delete a trip (mark as deleted without removing from database)
 */
export const deleteTrip = async (id: string): Promise<void> => {
  try {
    const database = getDatabase();
    const now = Date.now();

    await database.runAsync(
      `UPDATE trips
       SET deleted = 1, updatedAt = ?
       WHERE id = ?`,
      [now, id]
    );

    console.log('Trip soft-deleted successfully:', id);
  } catch (error) {
    console.error('Error soft-deleting trip:', error);
    throw error;
  }
};

/**
 * Permanently delete all soft-deleted trips from local database
 * This should be called after server cleanup to keep local and server in sync
 */
export const permanentlyDeleteSoftDeletedTrips = async (): Promise<number> => {
  try {
    const database = getDatabase();
    const result = await database.runAsync('DELETE FROM trips WHERE deleted = 1');
    const deletedCount = result.changes || 0;
    console.log(`Permanently deleted ${deletedCount} soft-deleted trips from local DB`);
    return deletedCount;
  } catch (error) {
    console.error('Error permanently deleting trips:', error);
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
    deleted: row.deleted ? true : false,
  };
};
