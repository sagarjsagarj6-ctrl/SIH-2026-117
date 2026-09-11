/**
 * MongoConnector — real read-only access through the configured local
 * Mongoose connection. It does not fabricate schemas or records when MongoDB
 * is unavailable.
 */

import mongoose from 'mongoose';
import { DATASOURCE_CONFIG } from '../../../config/datasources.js';

const safeCollection = (name) => {
  const value = String(name || '');
  if (!/^[a-zA-Z0-9_]+$/.test(value)) throw new Error('Unsafe MongoDB collection name rejected.');
  return value;
};

export class MongoConnector {
  static async testConnection({ host, port, database }) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      return {
        success: false,
        status: 'CONNECTION_FAILED',
        latencyMs: null,
        message: `MongoDB is not connected to ${host}:${port}/${database}. Start the local MongoDB service or configure MONGODB_URI.`
      };
    }
    const startedAt = Date.now();
    try {
      await mongoose.connection.db.command({ ping: 1 });
      return {
        success: true,
        status: 'CONNECTED',
        latencyMs: Date.now() - startedAt,
        serverVersion: 'MongoDB (live configured connection)',
        message: `Connected to the live read-only MongoDB connection for ${database}.`
      };
    } catch (err) {
      return { success: false, status: 'CONNECTION_FAILED', latencyMs: Date.now() - startedAt, error: err.message };
    }
  }

  static async introspectSchema({ database }) {
    if (!mongoose.connection?.db || mongoose.connection.readyState !== 1) {
      return { success: false, status: 'CONNECTION_FAILED', database, collections: {}, message: 'MongoDB connection is unavailable.' };
    }
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const schemaMap = {};
      for (const col of collections) {
        const collection = mongoose.connection.db.collection(safeCollection(col.name));
        const sample = await collection.findOne({});
        schemaMap[col.name] = {
          count: await collection.countDocuments(),
          fields: sample ? Object.keys(sample) : ['_id', 'createdAt', 'updatedAt']
        };
      }
      return { success: true, database, collections: schemaMap };
    } catch (error) {
      return { success: false, status: 'INTROSPECTION_FAILED', database, collections: {}, error: error.message };
    }
  }

  static async fetchSampleRecords(collectionName, limit = 5) {
    if (!mongoose.connection?.db || mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is unavailable; live records cannot be synchronized.');
    }
    const collection = mongoose.connection.db.collection(safeCollection(collectionName));
    return collection.find({}).limit(Math.min(Math.max(Number(limit) || 5, 1), DATASOURCE_CONFIG.maxRowsLimit)).toArray();
  }
}
