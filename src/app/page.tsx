"use client";

import { useState, useEffect, useCallback } from 'react';
import { DatabaseConnectionForm } from '@/components/database-connection-form';
import { TablesList } from '@/components/tables-list';
import { ResponsiveTableViewer } from '@/components/responsive-table-viewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseConnection, TableInfo } from '@/lib/database';
import { Database, Zap, Shield, Users } from 'lucide-react';

interface ConnectedDatabase {
  id: string;
  name: string;
  config: DatabaseConnection;
}

export default function Home() {
  const [connectedDatabase, setConnectedDatabase] = useState<ConnectedDatabase | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<{ name: string; schema: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isConnectingEnv, setIsConnectingEnv] = useState(false);
  const [hasTriedAutoConnect, setHasTriedAutoConnect] = useState(false);

  const handleConnect = async (connectionId: string, config: DatabaseConnection) => {
    setIsConnecting(true);
    
    try {
      const response = await fetch('/api/database/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId, config }),
      });

      if (response.ok) {
        setConnectedDatabase({ id: connectionId, name: connectionId, config });
        await loadTables(connectionId);
      } else {
        const error = await response.json();
        alert(`Connection failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect to database');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectFromEnv = async () => {
    setIsConnectingEnv(true);
    const connectionId = 'env-connection';
    
    try {
      const response = await fetch('/api/database/connect-env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      if (response.ok) {
        const data = await response.json();
        setConnectedDatabase({ 
          id: connectionId, 
          name: `${data.config.database} (from ENV)`, 
          config: data.config 
        });
        await loadTables(connectionId);
      } else {
        const error = await response.json();
        alert(`Environment connection failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Environment connection error:', error);
      alert('Failed to connect using environment variable');
    } finally {
      setIsConnectingEnv(false);
    }
  };

  const loadTables = async (connectionId: string) => {
    setIsLoadingTables(true);
    try {
      const response = await fetch(`/api/database/tables?connectionId=${connectionId}`);
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables);
      } else {
        console.error('Failed to load tables');
      }
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handleTableSelect = useCallback((tableName: string, schemaName: string) => {
    setSelectedTable({ name: tableName, schema: schemaName });
  }, []);

  const handleDisconnect = async () => {
    if (connectedDatabase) {
      try {
        await fetch(`/api/database/connect?connectionId=${connectedDatabase.id}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
      
      setConnectedDatabase(null);
      setTables([]);
      setSelectedTable(null);
    }
  };

  // Attempt to auto-connect using environment variable on page load
  useEffect(() => {
    if (!hasTriedAutoConnect && !connectedDatabase) {
      setHasTriedAutoConnect(true);
      // Silently try to connect using environment variable
      const tryAutoConnect = async () => {
        try {
          const response = await fetch('/api/database/connect-env', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ connectionId: 'env-connection' }),
          });

          if (response.ok) {
            const data = await response.json();
            setConnectedDatabase({ 
              id: 'env-connection', 
              name: `${data.config.database} (auto-connected)`, 
              config: data.config 
            });
            await loadTables('env-connection');
          }
          // Silently fail if no environment variable or connection fails
        } catch {
          // Silently fail
          console.log('Auto-connect failed, showing manual connection form');
        }
      };
      
      tryAutoConnect();
    }
  }, [hasTriedAutoConnect, connectedDatabase]);

  if (!connectedDatabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-yellow-400 p-3 rounded-lg mr-3">
                <Database className="h-8 w-8 text-black" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">QueryBee</h1>
            </div>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              A cloud-based SaaS platform that makes database management effortless. 
              Connect your SQL databases in seconds, view, edit, and manage your data 
              through a beautiful, intuitive interface—without writing a single line of code.
            </p>
            
            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <CardTitle className="text-lg">Lightning Fast</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Connect to your PostgreSQL databases in seconds and start managing your data immediately.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="text-center">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <CardTitle className="text-lg">Secure & Safe</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Your database credentials are secure with confirmation dialogs before any data changes.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <CardTitle className="text-lg">User Friendly</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    No SQL knowledge required. Click to edit, save with confidence, and manage data visually.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Environment Connection Option */}
          <div className="mb-8">
            <Card className="w-full max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Quick Connect</CardTitle>
                <CardDescription>
                  Connect using your DATABASE_URL environment variable
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleConnectFromEnv}
                  disabled={isConnectingEnv}
                  className="w-full"
                  size="lg"
                >
                  {isConnectingEnv ? 'Connecting...' : 'Connect from Environment'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Manual Connection Form */}
          <div className="mb-4 text-center">
            <p className="text-gray-600">or connect manually</p>
          </div>
          <DatabaseConnectionForm onConnect={handleConnect} isConnecting={isConnecting} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="bg-yellow-400 p-2 rounded-lg flex-shrink-0">
                <Database className="h-5 w-5 md:h-6 md:w-6 text-black" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">QueryBee</h1>
                <p className="text-xs md:text-sm text-gray-600 truncate">
                  Connected to: <span className="font-semibold">{connectedDatabase.name}</span>
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDisconnect} className="ml-2 flex-shrink-0">
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tables Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="lg:sticky lg:top-6">
              <TablesList
                tables={tables}
                onTableSelect={handleTableSelect}
                selectedTable={selectedTable || undefined}
                isLoading={isLoadingTables}
              />
            </div>
          </div>

          {/* Table Data Viewer */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {selectedTable && connectedDatabase ? (
              <ResponsiveTableViewer
                key={`${connectedDatabase.id}-${selectedTable.name}-${selectedTable.schema}`}
                connectionId={connectedDatabase.id}
                tableName={selectedTable.name}
                schemaName={selectedTable.schema}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center p-8 md:p-12">
                  <div className="text-center">
                    <Database className="h-12 w-12 md:h-16 md:w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">Select a Table</h3>
                    <p className="text-gray-500 text-sm md:text-base">
                      Choose a table below to view and edit its data
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}