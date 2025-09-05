"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatabaseConnection } from '@/lib/database';

interface DatabaseConnectionFormProps {
  onConnect: (connectionId: string, config: DatabaseConnection) => void;
  isConnecting: boolean;
}

export function DatabaseConnectionForm({ onConnect, isConnecting }: DatabaseConnectionFormProps) {
  const [config, setConfig] = useState<DatabaseConnection>({
    host: 'localhost',
    port: 5432,
    database: '',
    username: '',
    password: ''
  });

  const [connectionName, setConnectionName] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (connectionName && config.host && config.database && config.username) {
      onConnect(connectionName, config);
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/database/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful!' });
      } else {
        setTestResult({ success: false, message: result.error || 'Connection failed' });
      }
    } catch {
      setTestResult({ success: false, message: 'Network error occurred' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Connect to PostgreSQL Database</CardTitle>
        <CardDescription>
          Enter your database connection details to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="connectionName">Connection Name</Label>
            <Input
              id="connectionName"
              placeholder="My Database"
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              placeholder="localhost"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              placeholder="5432"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 5432 })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="database">Database</Label>
            <Input
              id="database"
              placeholder="database_name"
              value={config.database}
              onChange={(e) => setConfig({ ...config, database: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="username"
              value={config.username}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="password"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
            />
          </div>

          {testResult && (
            <div className={`p-3 rounded-md text-sm ${
              testResult.success 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={testConnection}
              disabled={isTestingConnection || !config.host || !config.database || !config.username}
              className="flex-1"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              type="submit"
              disabled={isConnecting || !connectionName || !testResult?.success}
              className="flex-1"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
