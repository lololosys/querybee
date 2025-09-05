import { NextRequest, NextResponse } from 'next/server';
import { getDbManager, DatabaseConnection } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, config }: { connectionId: string; config: DatabaseConnection } = body;

    if (!connectionId || !config) {
      return NextResponse.json(
        { error: 'Connection ID and config are required' },
        { status: 400 }
      );
    }

    const success = await getDbManager().createConnection(connectionId, config);
    
    if (success) {
      return NextResponse.json({ message: 'Connection successful' });
    } else {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    await getDbManager().closeConnection(connectionId);
    return NextResponse.json({ message: 'Connection closed' });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
