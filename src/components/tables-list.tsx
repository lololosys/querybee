"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableInfo } from '@/lib/database';
import { Database, Table } from 'lucide-react';

interface TablesListProps {
  tables: TableInfo[];
  onTableSelect: (tableName: string, schemaName: string) => void;
  selectedTable?: { name: string; schema: string };
  isLoading: boolean;
}

export function TablesList({ tables, onTableSelect, selectedTable, isLoading }: TablesListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Tables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading tables...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Tables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <Table className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tables found in this database</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedTables = tables.reduce((acc, table) => {
    if (!acc[table.schema_name]) {
      acc[table.schema_name] = [];
    }
    acc[table.schema_name].push(table);
    return acc;
  }, {} as Record<string, TableInfo[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Tables
        </CardTitle>
        <CardDescription>
          {tables.length} table{tables.length !== 1 ? 's' : ''} found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedTables).map(([schema, schemaTables]) => (
            <div key={schema} className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700 border-b pb-1">
                Schema: {schema}
              </h4>
              <div className="space-y-1">
                {schemaTables.map((table) => {
                  const isSelected = 
                    selectedTable?.name === table.table_name && 
                    selectedTable?.schema === table.schema_name;
                  
                  return (
                    <Button
                      key={`${table.schema_name}.${table.table_name}`}
                      variant={isSelected ? "default" : "ghost"}
                      className="w-full justify-between h-auto p-3 text-left"
                      onClick={() => onTableSelect(table.table_name, table.schema_name)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Table className="h-4 w-4 flex-shrink-0" />
                        <span className={`${isSelected ? "font-bold" : ""} truncate`}>
                          {table.table_name}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                        {table.column_count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
