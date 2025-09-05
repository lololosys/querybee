import { NextRequest, NextResponse } from 'next/server';
import { getDbManager, FilterCondition } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const tableName = searchParams.get('tableName');
    const schemaName = searchParams.get('schemaName') || 'public';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Parse filters from query params
    const filtersParam = searchParams.get('filters');
    let filters: FilterCondition[] = [];
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch (error) {
        console.error('Error parsing filters:', error);
      }
    }

    if (!connectionId || !tableName) {
      return NextResponse.json(
        { error: 'Connection ID and table name are required' },
        { status: 400 }
      );
    }

    const tableData = await getDbManager().getTableData(
      connectionId,
      tableName,
      schemaName,
      limit,
      offset,
      filters
    );

    return NextResponse.json(tableData);
  } catch (error) {
    console.error('Get table data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      connectionId,
      tableName,
      schemaName = 'public',
      primaryKeyColumn,
      primaryKeyValue,
      columnName,
      newValue
    } = body;

    if (!connectionId || !tableName || !primaryKeyColumn || !columnName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const success = await getDbManager().updateTableData(
      connectionId,
      tableName,
      schemaName,
      primaryKeyColumn,
      primaryKeyValue,
      columnName,
      newValue
    );

    if (success) {
      return NextResponse.json({ message: 'Update successful' });
    } else {
      return NextResponse.json(
        { error: 'Update failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Update table data error:', error);
    return NextResponse.json(
      { error: 'Failed to update table data' },
      { status: 500 }
    );
  }
}
