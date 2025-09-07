"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FilterCondition, ColumnInfo } from '@/lib/database';
import { Filter, Plus, X, Search } from 'lucide-react';

interface TableFiltersProps {
  columns: ColumnInfo[];
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  isLoading?: boolean;
}

const OPERATOR_LABELS = {
  equals: 'Equals',
  contains: 'Contains',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  greater_than: 'Greater than',
  less_than: 'Less than',
  is_null: 'Is null',
  is_not_null: 'Is not null'
};

const getOperatorsForDataType = (dataType: string) => {
  const baseOperators = ['equals', 'is_null', 'is_not_null'];
  
  if (dataType.includes('text') || dataType.includes('varchar') || dataType.includes('char')) {
    return [...baseOperators, 'contains', 'starts_with', 'ends_with'];
  }
  
  if (dataType.includes('int') || dataType.includes('numeric') || dataType.includes('decimal') || 
      dataType.includes('timestamp') || dataType.includes('date')) {
    return [...baseOperators, 'greater_than', 'less_than'];
  }
  
  return baseOperators;
};

export function TableFilters({ columns, filters, onFiltersChange, isLoading }: TableFiltersProps) {
  const [quickSearch, setQuickSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounced search function with better logic
  const debouncedSearch = useCallback(
    (searchTerm: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set loading state
      setIsSearching(true);

      debounceTimerRef.current = setTimeout(() => {
        const trimmedSearch = searchTerm.trim();
        
        // Get current manual filters (non-global search)
        const manualFilters = filters.filter(f => !f.column.startsWith('_global_search_'));
        
        if (!trimmedSearch) {
          // Clear search - only update if there were global search filters
          const hasGlobalFilters = filters.some(f => f.column.startsWith('_global_search_'));
          if (hasGlobalFilters) {
            onFiltersChange(manualFilters);
          }
        } else {
          // Create global search filter
          const searchableColumns = columns.filter(col => 
            col.data_type.includes('text') || 
            col.data_type.includes('varchar') || 
            col.data_type.includes('char') ||
            col.data_type.includes('int') ||
            col.data_type.includes('numeric')
          );

          if (searchableColumns.length > 0) {
            const globalSearchFilter: FilterCondition = {
              column: '_global_search_' + searchableColumns.map(c => c.column_name).join('_'),
              operator: 'contains',
              value: trimmedSearch
            };

            onFiltersChange([...manualFilters, globalSearchFilter]);
          }
        }
        
        setIsSearching(false);
      }, 500); // Increased debounce time for better performance
    },
    [columns, filters, onFiltersChange]
  );

  const handleQuickSearchChange = (searchTerm: string) => {
    setQuickSearch(searchTerm);
    debouncedSearch(searchTerm);
  };

  const addFilter = () => {
    const newFilter: FilterCondition = {
      column: columns[0].column_name,
      operator: 'equals',
      value: ''
    };
    const globalSearchFilters = filters.filter(f => f.column.startsWith('_global_search_'));
    const manualFilters = filters.filter(f => !f.column.startsWith('_global_search_'));
    onFiltersChange([...globalSearchFilters, ...manualFilters, newFilter]);
    setShowAdvancedFilters(true);
  };

  const updateFilter = (index: number, updatedFilter: Partial<FilterCondition>) => {
    // Don't update if the filter value is empty and requires a value
    if (!updatedFilter.value && ['equals', 'contains', 'starts_with', 'ends_with', 'greater_than', 'less_than'].includes(updatedFilter.operator || '')) {
      return;
    }

    const globalSearchFilters = filters.filter(f => f.column.startsWith('_global_search_'));
    const manualFilters = filters.filter(f => !f.column.startsWith('_global_search_'));
    const newManualFilters = [...manualFilters];
    newManualFilters[index] = { ...newManualFilters[index], ...updatedFilter };
    onFiltersChange([...globalSearchFilters, ...newManualFilters]);
  };

  const removeFilter = (index: number) => {
    const globalSearchFilters = filters.filter(f => f.column.startsWith('_global_search_'));
    const manualFilters = filters.filter(f => !f.column.startsWith('_global_search_'));
    const newManualFilters = manualFilters.filter((_, i) => i !== index);
    onFiltersChange([...globalSearchFilters, ...newManualFilters]);
  };

  const clearAllFilters = () => {
    setQuickSearch('');
    onFiltersChange([]);
    setShowAdvancedFilters(false);
    // Clear any pending debounced search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const manualFilters = filters.filter(f => !f.column.startsWith('_global_search_'));
  const activeFiltersCount = manualFilters.length;
  const hasQuickSearch = quickSearch.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
        <CardDescription>
          Filter and search table data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Search */}
        <div className="space-y-2">
          <Label htmlFor="quick-search" className="text-sm font-medium">
            Quick Search
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            )}
            <Input
              id="quick-search"
              placeholder="Search in all columns..."
              value={quickSearch}
              onChange={(e) => handleQuickSearchChange(e.target.value)}
              className="pl-10 pr-10 h-10 text-base" // Larger touch target for mobile
              disabled={isLoading}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        </div>

        {/* Filter Summary */}
        {(activeFiltersCount > 0 || hasQuickSearch) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">Active filters:</span>
            {hasQuickSearch && (
              <Badge variant="secondary" className="text-xs">
                Global search: &quot;{quickSearch}&quot;
              </Badge>
            )}
            {activeFiltersCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {activeFiltersCount} column filter{activeFiltersCount !== 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Advanced Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-sm h-9 px-4 w-full sm:w-auto"
            >
              {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={addFilter}
              className="text-sm h-9 px-4 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>

          {showAdvancedFilters && manualFilters.length > 0 && (
            <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
              {manualFilters.map((filter, index) => {
                const column = columns.find(col => col.column_name === filter.column);
                const availableOperators = column ? getOperatorsForDataType(column.data_type) : ['equals'];
                const needsValue = !['is_null', 'is_not_null'].includes(filter.operator);

                return (
                  <div key={index} className="space-y-3 p-3 bg-white rounded-md border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Column</Label>
                        <Select
                          value={filter.column}
                          onValueChange={(value) => updateFilter(index, { column: value })}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map(col => (
                              <SelectItem key={col.column_name} value={col.column_name}>
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{col.column_name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {col.data_type}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Operator</Label>
                        <Select
                          value={filter.operator}
                          onValueChange={(value) => updateFilter(index, { 
                            operator: value as FilterCondition['operator'],
                            value: ['is_null', 'is_not_null'].includes(value) ? undefined : filter.value
                          })}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOperators.map(op => (
                              <SelectItem key={op} value={op}>
                                {OPERATOR_LABELS[op as keyof typeof OPERATOR_LABELS]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Value</Label>
                        <Input
                          placeholder={needsValue ? "Enter value..." : "N/A"}
                          value={filter.value || ''}
                          onChange={(e) => updateFilter(index, { value: e.target.value })}
                          disabled={!needsValue || isLoading}
                          className="h-10 text-sm"
                          autoComplete="off"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-transparent">Remove</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFilter(index)}
                          className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
