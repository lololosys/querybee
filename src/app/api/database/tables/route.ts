import { NextRequest, NextResponse } from 'next/server';
import { getDbManager } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    const tables = await getDbManager().getTables(connectionId);
    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Get tables error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
