/**
 * Data Source Configuration Registry
 * Enforces air-gapped security, read-only policies, and private LAN IP validations.
 */

export const DATASOURCE_CONFIG = {
  maxQueryTimeoutMs: 30000,
  maxRowsLimit: 1000,
  enforceReadOnly: true,
  allowedPrivateSubnets: [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\.0\.0\.1$/,
    /^localhost$/
  ]
};

export const isPrivateLANAddress = (host) => {
  if (!host) return false;
  return DATASOURCE_CONFIG.allowedPrivateSubnets.some(regex => regex.test(host.trim()));
};

export const REGISTERED_DATA_SOURCES = [
  {
    id: 'ds-postgres-fin',
    name: 'Finance Ledger PostgreSQL (LAN)',
    type: 'postgres',
    host: '192.168.1.120',
    port: 5432,
    database: 'enterprise_ledger',
    department: 'Finance',
    status: 'ACTIVE',
    readOnly: true,
    lastSync: new Date().toISOString(),
    tables: ['financial_ledgers', 'quarterly_audits', 'expense_reports', 'vendor_invoices']
  },
  {
    id: 'ds-mongo-ops',
    name: 'Operations Inventory MongoDB (Local)',
    type: 'mongodb',
    host: '127.0.0.1',
    port: 27017,
    database: 'supply_chain_db',
    department: 'Operations',
    status: 'ACTIVE',
    readOnly: true,
    lastSync: new Date().toISOString(),
    tables: ['warehouse_nodes', 'asset_tracking', 'procurement_orders', 'fleet_telemetry']
  },
  {
    id: 'ds-mysql-legal',
    name: 'Legal Compliance MySQL (LAN)',
    type: 'mysql',
    host: '10.0.4.55',
    port: 3306,
    database: 'legal_archive',
    department: 'Legal',
    status: 'ACTIVE',
    readOnly: true,
    lastSync: new Date().toISOString(),
    tables: ['contracts_registry', 'regulatory_filings', 'nda_records', 'ip_patents']
  },
  {
    id: 'ds-sqlite-eng',
    name: 'Engineering Telemetry SQLite (On-Premise)',
    type: 'sqlite',
    host: 'localhost',
    port: 0,
    database: 'codebase_metrics.db',
    department: 'Engineering',
    status: 'ACTIVE',
    readOnly: true,
    lastSync: new Date().toISOString(),
    tables: ['build_logs', 'security_vulnerabilities', 'service_health', 'git_commits']
  }
];
