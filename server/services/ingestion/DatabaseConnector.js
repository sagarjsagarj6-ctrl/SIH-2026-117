/**
 * DatabaseConnector — High-level Database Ingestion Orchestrator.
 * Handles database testing, schema discovery, data extraction, and vector ingestion into the knowledge base.
 */

import { REGISTERED_DATA_SOURCES, isPrivateLANAddress } from '../../config/datasources.js';
import { MongoConnector } from './connectors/MongoConnector.js';
import { SQLConnector } from './connectors/SQLConnector.js';

export class DatabaseConnector {
  static listDataSources(departmentFilter = null) {
    if (!departmentFilter || departmentFilter === 'All') {
      return REGISTERED_DATA_SOURCES;
    }
    return REGISTERED_DATA_SOURCES.filter(ds => ds.department === departmentFilter || ds.department === 'All');
  }

  static getDataSourceById(id) {
    return REGISTERED_DATA_SOURCES.find(ds => ds.id === id);
  }

  static async testConnection({ type, host, port, database }) {
    if (!isPrivateLANAddress(host)) {
      throw new Error(`Air-gap security policy violation: Host '${host}' is not within an allowed private LAN subnet (10.x.x.x, 172.16-31.x.x, 192.168.x.x, localhost).`);
    }

    if (type === 'mongodb') {
      return MongoConnector.testConnection({ host, port, database });
    }
    return SQLConnector.testConnection({ type, host, port, database });
  }

  static async introspectSchema(dataSourceId) {
    const ds = this.getDataSourceById(dataSourceId);
    if (!ds) throw new Error(`Data source '${dataSourceId}' not found`);

    if (ds.type === 'mongodb') {
      return MongoConnector.introspectSchema(ds);
    }
    return SQLConnector.introspectSchema(ds);
  }

  static async syncTableToKnowledge({ dataSourceId, tableName, user }) {
    const ds = this.getDataSourceById(dataSourceId);
    if (!ds) throw new Error(`Data source '${dataSourceId}' not found`);

    let records = [];
    if (ds.type === 'mongodb') {
      records = await MongoConnector.fetchSampleRecords(tableName);
    } else {
      const result = await SQLConnector.executeQuery({
        type: ds.type,
        database: ds.database,
        sqlQuery: `SELECT * FROM ${tableName} LIMIT 10`
      });
      records = result.rows;
    }

    // Convert records to structured document text
    const textContent = `=== LIVE DATABASE SNAPSHOT: ${ds.name} [${tableName}] ===\n` +
      `Source ID: ${ds.id}\n` +
      `Database: ${ds.database} (${ds.type.toUpperCase()})\n` +
      `Department Scope: ${ds.department}\n` +
      `Extracted At: ${new Date().toISOString()}\n\n` +
      `-- RECORD SNAPSHOTS --\n` +
      JSON.stringify(records, null, 2);

    return {
      success: true,
      title: `${ds.name} — Table: ${tableName}`,
      category: 'Database Snapshot',
      department: ds.department,
      fileType: 'DATABASE',
      sensitivity: 'Confidential',
      textContent,
      recordCount: records.length
    };
  }
}
