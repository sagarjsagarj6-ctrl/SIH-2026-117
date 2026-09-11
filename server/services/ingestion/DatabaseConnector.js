/**
 * DatabaseConnector — High-level Database Ingestion Orchestrator.
 * Handles database testing, schema discovery, data extraction, and vector ingestion into the knowledge base.
 */

import { REGISTERED_DATA_SOURCES, isPrivateLANAddress } from '../../config/datasources.js';
import { MongoConnector } from './connectors/MongoConnector.js';
import { SQLConnector } from './connectors/SQLConnector.js';

const normalizedDepartment = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const departmentsMatch = (sourceDepartment, userDepartment) => {
  const source = normalizedDepartment(sourceDepartment);
  const user = normalizedDepartment(userDepartment);
  return source === 'all' || source === user || source.includes(user) || user.includes(source);
};

export class DatabaseConnector {
  static listDataSources(departmentFilter = null) {
    if (!departmentFilter || departmentFilter === 'All') {
      return REGISTERED_DATA_SOURCES;
    }
    return REGISTERED_DATA_SOURCES.filter(ds => departmentsMatch(ds.department, departmentFilter));
  }

  static getDataSourceById(id) {
    return REGISTERED_DATA_SOURCES.find(ds => ds.id === id);
  }

  static getAuthorizedDataSource(id, user) {
    const dataSource = this.getDataSourceById(id);
    if (!dataSource) throw new Error(`Data source '${id}' not found`);
    if (user?.role !== 'Admin' && !departmentsMatch(dataSource.department, user?.department)) {
      throw new Error('Access denied: this data source belongs to another department.');
    }
    return dataSource;
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

  static async introspectSchema(dataSourceId, user) {
    const ds = this.getAuthorizedDataSource(dataSourceId, user);

    if (ds.type === 'mongodb') {
      return MongoConnector.introspectSchema(ds);
    }
    return SQLConnector.introspectSchema(ds);
  }

  static async syncTableToKnowledge({ dataSourceId, tableName, user }) {
    const ds = this.getAuthorizedDataSource(dataSourceId, user);
    const normalizedTableName = String(tableName || '').trim();
    if (!/^[a-zA-Z0-9_]+$/.test(normalizedTableName)) {
      throw new Error('Table name must contain only letters, numbers, and underscores.');
    }
    if (Array.isArray(ds.tables) && !ds.tables.includes(normalizedTableName)) {
      throw new Error(`Table '${normalizedTableName}' is not registered for this data source.`);
    }

    let records = [];
    if (ds.type === 'mongodb') {
      records = await MongoConnector.fetchSampleRecords(normalizedTableName);
    } else {
      const result = await SQLConnector.executeQuery({
        type: ds.type,
        host: ds.host,
        port: ds.port,
        database: ds.database,
        sqlQuery: `SELECT * FROM ${normalizedTableName} LIMIT 10`
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
      title: `${ds.name} — Table: ${normalizedTableName}`,
      category: 'Database Snapshot',
      department: ds.department,
      fileType: 'DATABASE',
      sensitivity: 'Confidential',
      textContent,
      recordCount: records.length
    };
  }
}
