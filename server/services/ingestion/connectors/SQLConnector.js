/**
 * SQLConnector — optional real read-only PostgreSQL, MySQL, and SQLite access.
 * Drivers are loaded dynamically so the platform can run without them, but it
 * never reports a simulated database connection as live.
 */

import { DATASOURCE_CONFIG } from '../../../config/datasources.js';

const DRIVER_NAMES = {
  postgres: 'pg',
  postgresql: 'pg',
  mysql: 'mysql2/promise',
  sqlite: 'better-sqlite3'
};

const missingDriver = (type, packageName) => ({
  success: false,
  status: 'DRIVER_NOT_INSTALLED',
  dbType: String(type).toUpperCase(),
  driver: packageName,
  message: `Install the optional ${packageName} driver in the air-gapped server environment to connect to ${type}.`
});

export class SQLConnector {
  static FORBIDDEN_SQL_KEYWORDS = [
    'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'UPDATE', 'INSERT', 'CREATE', 'REPLACE', 'GRANT', 'REVOKE'
  ];

  static validateReadOnly(sqlQuery) {
    const trimmed = String(sqlQuery || '').trim().toUpperCase();
    for (const kw of this.FORBIDDEN_SQL_KEYWORDS) {
      if (new RegExp(`\\b${kw}\\b`, 'i').test(trimmed)) {
        return { allowed: false, error: `Security Policy Violation: Mutation operation "${kw}" is forbidden. SQL connectors are strictly read-only.` };
      }
    }
    if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('EXPLAIN') && !trimmed.startsWith('SHOW') && !trimmed.startsWith('DESCRIBE')) {
      return { allowed: false, error: 'Security Policy Violation: Only SELECT/EXPLAIN queries are permitted.' };
    }
    return { allowed: true };
  }

  static async loadDriver(type) {
    const packageName = DRIVER_NAMES[String(type || '').toLowerCase()];
    if (!packageName) throw new Error(`Unsupported SQL database type: ${type}`);
    try {
      return { packageName, module: await import(packageName) };
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND') return { packageName, missing: true };
      throw error;
    }
  }

  static async testConnection({ type, host, port, database, user, password, filename }) {
    const normalizedType = String(type || '').toLowerCase();
    const driver = await this.loadDriver(normalizedType);
    if (driver.missing) return missingDriver(normalizedType, driver.packageName);

    const startedAt = Date.now();
    try {
      if (normalizedType === 'sqlite') {
        const Database = driver.module.default || driver.module;
        const db = new Database(filename || database, { readonly: true, fileMustExist: true });
        db.prepare('SELECT 1').get();
        db.close();
      } else if (normalizedType === 'postgres' || normalizedType === 'postgresql') {
        const { Client } = driver.module;
        const client = new Client({ host, port, database, user, password, connectionTimeoutMillis: DATASOURCE_CONFIG.maxQueryTimeoutMs });
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
      } else if (normalizedType === 'mysql') {
        const mysql = driver.module.default || driver.module;
        const connection = await mysql.createConnection({ host, port, database, user, password, connectTimeout: DATASOURCE_CONFIG.maxQueryTimeoutMs });
        await connection.query('SELECT 1');
        await connection.end();
      }
      return {
        success: true,
        status: 'CONNECTED',
        dbType: normalizedType.toUpperCase(),
        latencyMs: Date.now() - startedAt,
        maxTimeoutSec: DATASOURCE_CONFIG.maxQueryTimeoutMs / 1000,
        message: `Connected to the live read-only ${normalizedType} source.`
      };
    } catch (error) {
      return {
        success: false,
        status: 'CONNECTION_FAILED',
        dbType: normalizedType.toUpperCase(),
        latencyMs: Date.now() - startedAt,
        error: error.message
      };
    }
  }

  static async introspectSchema({ type, host, port, database, user, password, filename, tables = [] }) {
    const normalizedType = String(type || '').toLowerCase();
    const driver = await this.loadDriver(normalizedType);
    if (driver.missing) return missingDriver(normalizedType, driver.packageName);

    if (normalizedType === 'sqlite') {
      const Database = driver.module.default || driver.module;
      const db = new Database(filename || database, { readonly: true, fileMustExist: true });
      const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(row => row.name);
      const schemaMap = {};
      for (const name of names) {
        schemaMap[name] = {
          columns: db.prepare(`PRAGMA table_info(${this.safeIdentifier(name)})`).all().map(column => ({ column: column.name, type: column.type, nullable: !column.notnull, pk: Boolean(column.pk) })),
          estimatedRows: db.prepare(`SELECT COUNT(*) AS count FROM ${this.safeIdentifier(name)}`).get().count
        };
      }
      db.close();
      return { success: true, database, dbType: normalizedType, tables: schemaMap };
    }

    if (normalizedType === 'postgres' || normalizedType === 'postgresql') {
      const { Client } = driver.module;
      const client = new Client({ host, port, database, user, password, connectionTimeoutMillis: DATASOURCE_CONFIG.maxQueryTimeoutMs });
      await client.connect();
      const tableResult = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
      const schemaMap = {};
      for (const row of tableResult.rows) {
        const columns = await client.query('SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position', ['public', row.table_name]);
        schemaMap[row.table_name] = { columns: columns.rows.map(column => ({ column: column.column_name, type: column.data_type, nullable: column.is_nullable === 'YES' })) };
      }
      await client.end();
      return { success: true, database, dbType: normalizedType, tables: schemaMap };
    }

    const mysql = driver.module.default || driver.module;
    const connection = await mysql.createConnection({ host, port, database, user, password, connectTimeout: DATASOURCE_CONFIG.maxQueryTimeoutMs });
    const [tableRows] = await connection.query('SHOW TABLES');
    const schemaMap = {};
    for (const row of tableRows) {
      const name = Object.values(row)[0];
      const [columns] = await connection.query(`DESCRIBE ${this.safeIdentifier(name)}`);
      schemaMap[name] = { columns: columns.map(column => ({ column: column.Field, type: column.Type, nullable: column.Null === 'YES', pk: column.Key === 'PRI' })) };
    }
    await connection.end();
    return { success: true, database, dbType: normalizedType, tables: schemaMap };
  }

  static async executeQuery({ type, host, port, database, user, password, filename, sqlQuery }) {
    const validation = this.validateReadOnly(sqlQuery);
    if (!validation.allowed) throw new Error(validation.error);
    const normalizedType = String(type || '').toLowerCase();
    const driver = await this.loadDriver(normalizedType);
    if (driver.missing) throw new Error(missingDriver(normalizedType, driver.packageName).message);

    const startedAt = Date.now();
    if (normalizedType === 'sqlite') {
      const Database = driver.module.default || driver.module;
      const db = new Database(filename || database, { readonly: true, fileMustExist: true });
      const rows = db.prepare(sqlQuery).all();
      db.close();
      return { success: true, rowCount: rows.length, columns: rows[0] ? Object.keys(rows[0]) : [], rows, executionTimeMs: Date.now() - startedAt };
    }

    if (normalizedType === 'postgres' || normalizedType === 'postgresql') {
      const { Client } = driver.module;
      const client = new Client({ host, port, database, user, password, connectionTimeoutMillis: DATASOURCE_CONFIG.maxQueryTimeoutMs });
      await client.connect();
      const result = await client.query(sqlQuery);
      await client.end();
      return { success: true, rowCount: result.rowCount, columns: result.fields.map(field => field.name), rows: result.rows, executionTimeMs: Date.now() - startedAt };
    }

    const mysql = driver.module.default || driver.module;
    const connection = await mysql.createConnection({ host, port, database, user, password, connectTimeout: DATASOURCE_CONFIG.maxQueryTimeoutMs });
    const [rows, fields] = await connection.query(sqlQuery);
    await connection.end();
    return { success: true, rowCount: rows.length, columns: fields.map(field => field.name), rows, executionTimeMs: Date.now() - startedAt };
  }

  static safeIdentifier(identifier) {
    const value = String(identifier || '');
    if (!/^[a-zA-Z0-9_]+$/.test(value)) throw new Error('Unsafe SQL identifier rejected.');
    return value;
  }
}
