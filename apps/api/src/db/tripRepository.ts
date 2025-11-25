import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { TripDTO } from '../types/trip.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTest = process.env.NODE_ENV === 'test';

// Base data directory: inside the project directory (works locally + on Render)
const defaultDataDir = path.join(__dirname, '../../data');

// Optional override from env (if you ever want a custom path)
const envDbFile = process.env.DB_FILE_PATH;

// Decide file names
const defaultMainDbFile = path.join(defaultDataDir, 'trails-api.sqlite');
const defaultTestDbFile = path.join(defaultDataDir, 'trails-api.test.sqlite');

// Final DB file path
const dbFile =
  envDbFile ??
  (isTest ? defaultTestDbFile : defaultMainDbFile);

// Ensure directory exists
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

console.log('Using SQLite database:', dbFile);

/**
 * TripRecord - Database row representation
 */
export interface TripRecord {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes: string | null;
  updatedAt: number;
  deleted: number; // 0 or 1
}

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

/**
 * Initialize the database connection and create tables
 */
async function initDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (db) {
    return db;
  }

  db = await open({
    filename: dbFile,
    driver: sqlite3.Database,
  });

  // Apply pragmas for durability
  await db.exec('PRAGMA journal_mode = WAL;');
  await db.exec('PRAGMA foreign_keys = ON;');

  // Create trips table if it doesn't exist
  await db.exec(`
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

  console.log('✅ SQLite database initialized:', dbFile);

  return db;
}

/**
 * Get database instance (initialize if needed)
 */
async function getDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (!db) {
    return await initDatabase();
  }
  return db;
}

/**
 * Get trips modified after the given timestamp (or all trips if since is null)
 * @param since - Optional Unix timestamp (ms). If null, returns all trips
 * @returns Array of trip records ordered by updatedAt ASC
 */
export async function getTripsSince(since: number | null): Promise<TripRecord[]> {
  const database = await getDb();

  if (since === null || since === undefined) {
    return await database.all<TripRecord[]>(
      'SELECT * FROM trips ORDER BY updatedAt ASC'
    );
  }

  return await database.all<TripRecord[]>(
    'SELECT * FROM trips WHERE updatedAt > ? ORDER BY updatedAt ASC',
    [since]
  );
}

/**
 * Get all trips (convenience function)
 * @returns All trip records ordered by updatedAt ASC
 */
export async function getAllTrips(): Promise<TripRecord[]> {
  const database = await getDb();
  return await database.all<TripRecord[]>(
    'SELECT * FROM trips ORDER BY updatedAt ASC'
  );
}

/**
 * Upsert a trip from client using server-controlled timestamp
 * Implements last-writer-wins by always replacing existing trips
 *
 * @param input - Trip data from client (client's updatedAt is ignored)
 * @returns The final TripRecord after writing to database
 */
export async function upsertTripFromClient(input: {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
  deleted: boolean;
}): Promise<TripRecord> {
  const database = await getDb();

  // Server assigns authoritative timestamp (ignore client's updatedAt)
  const serverUpdatedAt = Date.now();

  // Use INSERT ... ON CONFLICT for upsert with server-controlled timestamp
  await database.run(
    `INSERT INTO trips (id, title, destination, startDate, endDate, notes, updatedAt, deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       destination = excluded.destination,
       startDate = excluded.startDate,
       endDate = excluded.endDate,
       notes = excluded.notes,
       updatedAt = excluded.updatedAt,
       deleted = excluded.deleted`,
    [
      input.id,
      input.title,
      input.destination,
      input.startDate,
      input.endDate,
      input.notes || null,
      serverUpdatedAt,
      input.deleted ? 1 : 0,
    ]
  );

  // Fetch and return the final record
  const record = await database.get<TripRecord>(
    'SELECT * FROM trips WHERE id = ?',
    [input.id]
  );

  if (!record) {
    throw new Error(`Failed to retrieve upserted trip: ${input.id}`);
  }

  return record;
}

/**
 * Get trips for incremental sync (used by /trips and /trips/batch)
 * @param since - If null, returns all trips; otherwise returns trips where updatedAt > since
 * @returns Array of trip records ordered by updatedAt ASC
 */
export async function getTripsForIncrementalSync(
  since: number | null
): Promise<TripRecord[]> {
  return await getTripsSince(since);
}

/**
 * Map a database record to TripDTO
 * @param record - Database row
 * @returns TripDTO for API response
 */
export function toTripDTO(record: TripRecord): TripDTO {
  return {
    id: record.id,
    title: record.title,
    destination: record.destination,
    startDate: record.startDate,
    endDate: record.endDate,
    notes: record.notes ?? undefined,
    updatedAt: record.updatedAt,
    deleted: !!record.deleted,
  };
}

/**
 * Clear all trips from the database (for testing only)
 * WARNING: This deletes all data - use only in tests!
 */
export async function clearAllTrips(): Promise<void> {
  const database = await getDb();
  await database.run('DELETE FROM trips');
}

// Initialize database on module load
initDatabase().catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
