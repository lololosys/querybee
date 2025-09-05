import { NextRequest, NextResponse } from 'next/server';
import { getDbManager, parseDatabaseUrl } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'DATABASE_URL environment variable is not set' },
        { status: 400 }
      );
    }

    console.log('Attempting to parse DATABASE_URL...');
    const config = parseDatabaseUrl(databaseUrl);
    
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid DATABASE_URL format. Expected: postgresql://username:password@host:port/database' },
        { status: 400 }
      );
    }

    console.log('Parsed config:', {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      hasPassword: !!config.password
    });

    // Close existing connection with same ID if it exists
    try {
      await getDbManager().closeConnection(connectionId);
    } catch {
      // Ignore if connection doesn't exist
    }

    // For environment connections, also store under a known key for persistence
    const envConnectionId = 'env-connection';
    if (connectionId !== envConnectionId) {
      try {
        await getDbManager().closeConnection(envConnectionId);
      } catch {
        // Ignore if connection doesn't exist
      }
      await getDbManager().createConnection(envConnectionId, config);
    }

    const success = await getDbManager().createConnection(connectionId, config);
    
    if (success) {
      console.log('Database connection successful');
      return NextResponse.json({ 
        message: 'Connection successful',
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          username: config.username
          // Don't return password for security
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to connect to database. Please check your DATABASE_URL credentials.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Environment connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
