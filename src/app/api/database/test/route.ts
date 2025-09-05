import { NextRequest, NextResponse } from 'next/server';
import { getDbManager, DatabaseConnection } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const config: DatabaseConnection = await request.json();

    if (!config.host || !config.database || !config.username) {
      return NextResponse.json(
        { error: 'Host, database, and username are required' },
        { status: 400 }
      );
    }

    const success = await getDbManager().testConnection(config);
    
    if (success) {
      return NextResponse.json({ message: 'Connection test successful' });
    } else {
      return NextResponse.json(
        { error: 'Connection test failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
