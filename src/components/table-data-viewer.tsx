"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TableData, FilterCondition } from '@/lib/database';
import { TableFilters } from './table-filters';
import { ChevronLeft, ChevronRight, Edit3, Save, X, Database } from 'lucide-react';

interface TableDataViewerProps {
  connectionId: string;
  tableName: string;
  schemaName: string;
}

interface EditingCell {
  rowIndex: number;
  columnName: string;
  originalValue: unknown;
  newValue: string;
}

function TableDataViewerComponent({ connectionId, tableName, schemaName }: TableDataViewerProps) {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  const fetchTableData = useCallback(async (page: number = 0, currentFilters: FilterCondition[] = []) => {
    setIsLoading(true);
    try {
      const offset = page * pageSize;
      const filtersParam = currentFilters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(currentFilters))}` : '';
      const response = await fetch(
        `/api/database/table-data?connectionId=${connectionId}&tableName=${tableName}&schemaName=${schemaName}&limit=${pageSize}&offset=${offset}${filtersParam}`
      );
      
      if (response.ok) {
        const data: TableData = await response.json();
        setTableData(data);
      } else {
        console.error('Failed to fetch table data');
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [connectionId, tableName, schemaName]);

  // No refs required

  useEffect(() => {
    if (connectionId && tableName && schemaName) {
      setCurrentPage(0);
      fetchTableData(0, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, tableName, schemaName]);

  const handleFiltersChange = useCallback((newFilters: FilterCondition[]) => {
    // Avoid redundant updates and fetches if filters didn't actually change
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(newFilters);
    if (!filtersChanged) return;
    setFilters(newFilters);
    setCurrentPage(0);
    fetchTableData(0, newFilters);
  }, [filters, fetchTableData]);

  const nextPage = useCallback(() => {
    if (tableData && (currentPage + 1) * pageSize < (tableData.filteredCount !== undefined ? tableData.filteredCount : tableData.totalCount)) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      fetchTableData(newPage, filters);
    }
  }, [tableData, currentPage, pageSize, filters, fetchTableData]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      fetchTableData(newPage, filters);
    }
  }, [currentPage, filters, fetchTableData]);

  const handleCellClick = useCallback((rowIndex: number, columnName: string, currentValue: unknown) => {
    setEditingCell({
      rowIndex,
      columnName,
      originalValue: currentValue,
      newValue: currentValue?.toString() || ''
    });
  }, []);

  const handleCellChange = useCallback((newValue: string) => {
    setEditingCell((prev) => (prev ? { ...prev, newValue } : prev));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const confirmSave = useCallback(() => {
    setShowSaveDialog(true);
  }, []);

  const saveCell = async () => {
    if (!editingCell || !tableData) return;

    setIsSaving(true);
    setShowSaveDialog(false);

    try {
      // Find primary key column (assuming it's the first column or has 'id' in name)
      const primaryKeyColumn = tableData.columns.find(col => 
        col.column_name.toLowerCase().includes('id') || 
        col.column_name === tableData.columns[0].column_name
      );

      if (!primaryKeyColumn) {
        alert('Cannot identify primary key column for this table');
        return;
      }

      const currentRow = tableData.rows[editingCell.rowIndex];
      const primaryKeyValue = currentRow[primaryKeyColumn.column_name];

      const response = await fetch('/api/database/table-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId,
          tableName,
          schemaName,
          primaryKeyColumn: primaryKeyColumn.column_name,
          primaryKeyValue,
          columnName: editingCell.columnName,
          newValue: editingCell.newValue
        }),
      });

      if (response.ok) {
        // Update local state
        const updatedRows = [...tableData.rows];
        updatedRows[editingCell.rowIndex] = {
          ...updatedRows[editingCell.rowIndex],
          [editingCell.columnName]: editingCell.newValue
        };
        
        setTableData({
          ...tableData,
          rows: updatedRows
        });
        
        setEditingCell(null);
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving cell:', error);
      alert('Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      confirmSave();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [confirmSave, cancelEdit]);


  const getDataTypeColor = (dataType: string) => {
    if (dataType.includes('int') || dataType.includes('serial')) return 'bg-blue-100 text-blue-800';
    if (dataType.includes('varchar') || dataType.includes('text')) return 'bg-green-100 text-green-800';
    if (dataType.includes('timestamp') || dataType.includes('date')) return 'bg-purple-100 text-purple-800';
    if (dataType.includes('boolean')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };


  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading table data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tableData) {
    return (
      <Card>
        <CardContent className="text-center p-8">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load table data</p>
        </CardContent>
      </Card>
    );
  }

  const displayCount = tableData.filteredCount !== undefined ? tableData.filteredCount : tableData.totalCount;
  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min((currentPage + 1) * pageSize, displayCount);

  return (
    <>
      <div className="space-y-6">
        {/* Filters */}
        {tableData && (
          <TableFilters
            columns={tableData.columns}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isLoading={isLoading}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {schemaName}.{tableName}
            </CardTitle>
            <CardDescription>
              Showing {startRow}-{endRow} of {displayCount} rows
              {tableData.filteredCount !== undefined && tableData.filteredCount !== tableData.totalCount && (
                <span className="text-blue-600"> (filtered from {tableData.totalCount} total)</span>
              )}
            </CardDescription>
          </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {tableData.columns.map((column) => (
                    <TableHead key={column.column_name} className="min-w-[120px]">
                      <div className="space-y-1">
                        <div className="font-semibold">{column.column_name}</div>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getDataTypeColor(column.data_type)}`}
                        >
                          {column.data_type}
                        </Badge>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {tableData.columns.map((column) => {
                      const cellValue = row[column.column_name];
                      
                      const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnName === column.column_name;
                      
                      return (
                        <TableCell key={column.column_name} className="relative group">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingCell?.newValue || ''}
                                onChange={(e) => handleCellChange(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="h-8 text-sm"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={confirmSave}
                                disabled={isSaving}
                                className="h-8 w-8 p-0"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="cursor-pointer hover:bg-gray-50 p-1 rounded flex items-center justify-between group"
                              onClick={() => handleCellClick(rowIndex, column.column_name, cellValue)}
                            >
                              <span className="truncate">
                                {cellValue === null ? (
                                  <span className="text-gray-400 italic">NULL</span>
                                ) : (
                                  cellValue?.toString() || ''
                                )}
                              </span>
                              <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {currentPage + 1} of {Math.ceil(displayCount / pageSize)}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={(currentPage + 1) * pageSize >= displayCount}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
        </Card>
      </div>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save this change? This will update the database directly.
              <br />
              <br />
              <strong>Column:</strong> {editingCell?.columnName}
              <br />
              <strong>Old value:</strong> {editingCell?.originalValue?.toString() || 'NULL'}
              <br />
              <strong>New value:</strong> {editingCell?.newValue || 'NULL'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelEdit}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveCell} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const TableDataViewer = TableDataViewerComponent;
