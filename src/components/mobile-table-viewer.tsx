"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TableData, FilterCondition } from '@/lib/database';
import { TableFilters } from './table-filters';
import { ChevronLeft, ChevronRight, Edit3, Save, X, Database, Eye, Smartphone } from 'lucide-react';

interface MobileTableViewerProps {
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

export function MobileTableViewer({ connectionId, tableName, schemaName }: MobileTableViewerProps) {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20; // Smaller page size for mobile
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showRowSheet, setShowRowSheet] = useState(false);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  // No refs required

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
    
    // Filter out empty filters that don't have values
    const validFilters = newFilters.filter(filter => {
      if (['is_null', 'is_not_null'].includes(filter.operator)) {
        return true; // These don't need values
      }
      return filter.value && filter.value.toString().trim() !== '';
    });
    
    setFilters(validFilters);
    setCurrentPage(0);
    fetchTableData(0, validFilters);
  }, [filters, fetchTableData]);

  const handleCellEdit = useCallback((rowIndex: number, columnName: string, currentValue: unknown) => {
    const stringValue = currentValue === null ? '' : String(currentValue);
    setEditingCell({
      rowIndex,
      columnName,
      originalValue: currentValue,
      newValue: stringValue
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

  const openRowDetails = (rowIndex: number) => {
    setSelectedRow(rowIndex);
    setShowRowSheet(true);
  };

  const getDataTypeColor = (dataType: string) => {
    if (dataType.includes('int') || dataType.includes('serial')) return 'bg-blue-100 text-blue-800';
    if (dataType.includes('varchar') || dataType.includes('text')) return 'bg-green-100 text-green-800';
    if (dataType.includes('timestamp') || dataType.includes('date')) return 'bg-purple-100 text-purple-800';
    if (dataType.includes('boolean')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const truncateValue = (value: unknown, maxLength: number = 20) => {
    if (value === null) return 'NULL';
    const str = String(value);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  };

  const nextPage = useCallback(() => {
    if (tableData && (currentPage + 1) * pageSize < tableData.totalCount) {
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
      <div className="space-y-4">
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
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5" />
              {schemaName}.{tableName}
            </CardTitle>
            <CardDescription>
              Showing {startRow}-{endRow} of {displayCount} rows • Tap rows to edit
              {tableData.filteredCount !== undefined && tableData.filteredCount !== tableData.totalCount && (
                <span className="block text-blue-600 text-xs">(filtered from {tableData.totalCount} total)</span>
              )}
              <div className="text-xs text-gray-500 mt-1">
                💡 Scroll to view more entries
              </div>
            </CardDescription>
          </CardHeader>
        <CardContent>
          {/* Mobile Card Layout */}
          <div className="overflow-auto max-h-[70vh] min-h-[400px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-6">
            <div className="space-y-6 px-2">
            {tableData.rows.map((row, rowIndex) => {
              const displayColumns = tableData.columns.slice(0, 3); // Show first 3 columns
              
              return (
                <Card 
                  key={rowIndex} 
                  className="cursor-pointer hover:shadow-lg active:scale-[0.98] transition-all border-l-4 border-l-blue-500 touch-manipulation"
                  onClick={() => openRowDetails(rowIndex)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <Badge variant="outline" className="text-sm px-3 py-1.5">
                        Row {startRow + rowIndex}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-5">
                      {displayColumns.map((column) => {
                        const value = row[column.column_name];
                        return (
                          <div key={column.column_name} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700">
                                {column.column_name}
                              </span>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs px-2 py-1 ${getDataTypeColor(column.data_type)}`}
                              >
                                {column.data_type}
                              </Badge>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border min-h-[48px] flex items-center">
                              <span className="text-sm text-gray-900 w-full">
                                {value === null ? (
                                  <span className="text-gray-400 italic">NULL</span>
                                ) : (
                                  <span className="font-mono break-words">{truncateValue(value, 50)}</span>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      
                      {tableData.columns.length > 3 && (
                        <div className="text-sm text-gray-500 pt-4 border-t border-gray-200 mt-4">
                          +{tableData.columns.length - 3} more fields
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
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
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={(currentPage + 1) * pageSize >= displayCount}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
        </Card>
      </div>

      {/* Row Details Sheet */}
      <Sheet open={showRowSheet} onOpenChange={setShowRowSheet}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Row {selectedRow !== null ? startRow + selectedRow : ''}</SheetTitle>
            <SheetDescription>
              Tap any field to edit its value. Changes are saved immediately to the database.
            </SheetDescription>
          </SheetHeader>
          
          {selectedRow !== null && tableData && (
            <div className="mt-6 space-y-6">
              {tableData.columns.map((column) => {
                const value = tableData.rows[selectedRow][column.column_name];
                const isEditing = editingCell?.rowIndex === selectedRow && 
                                 editingCell?.columnName === column.column_name;
                
                return (
                  <div key={column.column_name} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold text-gray-800">{column.column_name}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-sm px-3 py-1 ${getDataTypeColor(column.data_type)}`}
                      >
                        {column.data_type}
                      </Badge>
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl shadow-sm">
                        <div className="space-y-5">
                          <div className="flex items-center gap-3">
                            <span className="text-base font-semibold text-blue-800">Editing Field:</span>
                            <Badge variant="secondary" className="text-sm px-3 py-1">
                              {column.data_type}
                            </Badge>
                          </div>
                          
                          {column.data_type.includes('text') || 
                           (typeof editingCell.newValue === 'string' && editingCell.newValue.length > 50) ? (
                            <Textarea
                              value={editingCell.newValue}
                              onChange={(e) => handleCellChange(e.target.value)}
                              className="min-h-[140px] resize-none text-base p-4"
                              placeholder="Enter value..."
                              autoFocus
                            />
                          ) : (
                            <Input
                              value={editingCell.newValue}
                              onChange={(e) => handleCellChange(e.target.value)}
                              className="h-14 text-base px-4"
                              placeholder="Enter value..."
                              autoFocus
                            />
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                          <Button
                            size="sm"
                            onClick={confirmSave}
                            disabled={isSaving}
                            className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-medium text-base"
                          >
                            <Save className="h-5 w-5 mr-3" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            className="flex-1 h-14 font-medium text-base"
                          >
                            <X className="h-5 w-5 mr-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="p-4 border-2 border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[72px] flex items-center justify-between group touch-manipulation"
                        onClick={() => handleCellEdit(selectedRow, column.column_name, value)}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-base font-mono block break-words">
                            {value === null ? (
                              <span className="text-gray-400 italic">NULL</span>
                            ) : (
                              String(value)
                            )}
                          </span>
                        </div>
                        <Edit3 className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 flex-shrink-0 ml-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>

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
