import { ConnectionOptions } from 'node:tls';
import { Pool, Client } from 'pg';

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface TableInfo {
  table_name: string;
  schema_name: string;
  column_count: number;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

export interface FilterCondition {
  column: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'is_null' | 'is_not_null';
  value?: string;
}

export interface TableData {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  totalCount: number;
  filteredCount?: number;
}

export class DatabaseManager {
  private connections: Map<string, Pool> = new Map();
  private connectionConfigs: Map<string, DatabaseConnection> = new Map();

  async createConnection(connectionId: string, config: DatabaseConnection): Promise<boolean> {
    try {
      const ssl = process.env.NODE_ENV === 'production' ? {ssl: {
        rejectUnauthorized: false,
      }} : undefined;

      const pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: ssl as boolean | ConnectionOptions | undefined,
      });

      // Test the connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      this.connections.set(connectionId, pool);
      this.connectionConfigs.set(connectionId, config);
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  async testConnection(config: DatabaseConnection): Promise<boolean> {
    try {
      const client = new Client({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
      });

      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  private async ensureConnection(connectionId: string): Promise<Pool> {
    let pool = this.connections.get(connectionId);
    
    if (!pool) {
      // Try to recreate the connection if we have the config
      let config = this.connectionConfigs.get(connectionId);
      
      // For environment-based connections, parse DATABASE_URL if available
      if (!config && (connectionId.includes('env') || connectionId.includes('auto'))) {
        const databaseUrl = process.env.DATABASE_URL;
        if (databaseUrl) {
          const parsed = parseDatabaseUrl(databaseUrl);
          if (parsed) {
            config = parsed;
            console.log(`Using DATABASE_URL for connection ${connectionId}`);
          }
        }
      }
      
      if (config) {
        console.log(`Recreating connection ${connectionId}`);
        const success = await this.createConnection(connectionId, config);
        if (success) {
          pool = this.connections.get(connectionId);
        }
      }
      
      if (!pool) {
        throw new Error(`Connection not found and could not be recreated for ${connectionId}`);
      }
    }
    
    return pool;
  }

  async getTables(connectionId: string): Promise<TableInfo[]> {
    const pool = await this.ensureConnection(connectionId);

    const query = `
      SELECT 
        t.table_name,
        t.table_schema as schema_name,
        COUNT(c.column_name) as column_count
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
      WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog')
        AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name, t.table_schema
      ORDER BY t.table_schema, t.table_name;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  private buildWhereClause(filters: FilterCondition[], columns: ColumnInfo[]): { whereClause: string; values: unknown[] } {
    if (filters.length === 0) {
      return { whereClause: '', values: [] };
    }

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const filter of filters) {
      // Skip filters with empty values for value-requiring operators
      if (!filter.value && ['equals', 'contains', 'starts_with', 'ends_with', 'greater_than', 'less_than'].includes(filter.operator)) {
        continue;
      }

      // Handle global search specially
      if (filter.column.startsWith('_global_search_')) {
        const searchValue = filter.value;
        const searchableColumns = columns.filter(col => 
          col.data_type.includes('text') || 
          col.data_type.includes('varchar') || 
          col.data_type.includes('char') ||
          col.data_type.includes('int') ||
          col.data_type.includes('numeric')
        );

        const searchConditions = searchableColumns.map(col => {
          const colCondition = `"${col.column_name}"::text ILIKE $${paramIndex}`;
          return colCondition;
        });

        if (searchConditions.length > 0) {
          conditions.push(`(${searchConditions.join(' OR ')})`);
          values.push(`%${searchValue}%`);
          paramIndex++;
        }
        continue;
      }

      const columnName = `"${filter.column}"`;
      
      switch (filter.operator) {
        case 'equals':
          conditions.push(`${columnName}::text = $${paramIndex}`);
          values.push(String(filter.value));
          paramIndex++;
          break;
        case 'contains':
          conditions.push(`${columnName}::text ILIKE $${paramIndex}`);
          values.push(`%${filter.value}%`);
          paramIndex++;
          break;
        case 'starts_with':
          conditions.push(`${columnName}::text ILIKE $${paramIndex}`);
          values.push(`${filter.value}%`);
          paramIndex++;
          break;
        case 'ends_with':
          conditions.push(`${columnName}::text ILIKE $${paramIndex}`);
          values.push(`%${filter.value}`);
          paramIndex++;
          break;
        case 'greater_than':
          // Try to parse as number for numeric comparison, fallback to text
          const gtValue = isNaN(Number(filter.value)) ? filter.value : Number(filter.value);
          conditions.push(`${columnName} > $${paramIndex}`);
          values.push(gtValue);
          paramIndex++;
          break;
        case 'less_than':
          // Try to parse as number for numeric comparison, fallback to text
          const ltValue = isNaN(Number(filter.value)) ? filter.value : Number(filter.value);
          conditions.push(`${columnName} < $${paramIndex}`);
          values.push(ltValue);
          paramIndex++;
          break;
        case 'is_null':
          conditions.push(`${columnName} IS NULL`);
          break;
        case 'is_not_null':
          conditions.push(`${columnName} IS NOT NULL`);
          break;
      }
    }

    return {
      whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      values
    };
  }

  async getTableData(
    connectionId: string, 
    tableName: string, 
    schemaName: string = 'public',
    limit: number = 100,
    offset: number = 0,
    filters: FilterCondition[] = []
  ): Promise<TableData> {
    const pool = await this.ensureConnection(connectionId);

    // Get column information
    const columnQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = $2
      ORDER BY ordinal_position;
    `;

    const columnsResult = await pool.query(columnQuery, [tableName, schemaName]);
    const columns: ColumnInfo[] = columnsResult.rows;

    // Build WHERE clause from filters
    const { whereClause, values } = this.buildWhereClause(filters, columns);

    // Get total count (unfiltered)
    const totalCountQuery = `SELECT COUNT(*) as total FROM "${schemaName}"."${tableName}"`;
    const totalCountResult = await pool.query(totalCountQuery);
    const totalCount = parseInt(totalCountResult.rows[0].total);

    // Get filtered count if filters are applied
    let filteredCount = totalCount;
    if (whereClause) {
      const filteredCountQuery = `SELECT COUNT(*) as total FROM "${schemaName}"."${tableName}" ${whereClause}`;
      const filteredCountResult = await pool.query(filteredCountQuery, values);
      filteredCount = parseInt(filteredCountResult.rows[0].total);
    }

    // Get table data with pagination and filters
    const dataQuery = `SELECT * FROM "${schemaName}"."${tableName}" ${whereClause} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const dataResult = await pool.query(dataQuery, [...values, limit, offset]);

    return {
      columns,
      rows: dataResult.rows,
      totalCount,
      filteredCount
    };
  }

  async updateTableData(
    connectionId: string,
    tableName: string,
    schemaName: string = 'public',
    primaryKeyColumn: string,
    primaryKeyValue: unknown,
    columnName: string,
    newValue: unknown
  ): Promise<boolean> {
    const pool = await this.ensureConnection(connectionId);

    try {
      const query = `UPDATE "${schemaName}"."${tableName}" SET "${columnName}" = $1 WHERE "${primaryKeyColumn}" = $2`;
      await pool.query(query, [newValue, primaryKeyValue]);
      return true;
    } catch (error) {
      console.error('Update failed:', error);
      return false;
    }
  }

  async closeConnection(connectionId: string): Promise<void> {
    const pool = this.connections.get(connectionId);
    if (pool) {
      await pool.end();
      this.connections.delete(connectionId);
      this.connectionConfigs.delete(connectionId);
    }
  }

  async closeAllConnections(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(id => this.closeConnection(id));
    await Promise.all(promises);
  }
}

// Utility function to parse DATABASE_URL
export function parseDatabaseUrl(url: string): DatabaseConnection | null {
  try {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const parsedUrl = new URL(url);
    
    if (parsedUrl.protocol !== 'postgresql:' && parsedUrl.protocol !== 'postgres:') {
      return null;
    }

    const database = parsedUrl.pathname.slice(1); // Remove leading slash
    if (!database) {
      console.error('Database name is required in DATABASE_URL');
      return null;
    }

    const config: DatabaseConnection = {
      host: parsedUrl.hostname || 'localhost',
      port: parsedUrl.port ? parseInt(parsedUrl.port) : 5432,
      database,
      username: parsedUrl.username || '',
      password: decodeURIComponent(parsedUrl.password || '')
    };

    // Validate required fields
    if (!config.host || !config.username || !config.database) {
      console.error('Missing required connection parameters in DATABASE_URL');
      return null;
    }

    return config;
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error);
    return null;
  }
}

// Singleton database manager instance
let dbManagerInstance: DatabaseManager | null = null;

export function getDbManager(): DatabaseManager {
  if (!dbManagerInstance) {
    dbManagerInstance = new DatabaseManager();
  }
  return dbManagerInstance;
}
