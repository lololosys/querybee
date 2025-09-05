"use client";

import { useState, useEffect } from 'react';
import { TableDataViewer } from './table-data-viewer';
import { MobileTableViewer } from './mobile-table-viewer';

interface ResponsiveTableViewerProps {
  connectionId: string;
  tableName: string;
  schemaName: string;
}

export function ResponsiveTableViewer({ connectionId, tableName, schemaName }: ResponsiveTableViewerProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  if (isMobile) {
    return (
      <MobileTableViewer
        connectionId={connectionId}
        tableName={tableName}
        schemaName={schemaName}
      />
    );
  }

  return (
    <TableDataViewer
      connectionId={connectionId}
      tableName={tableName}
      schemaName={schemaName}
    />
  );
}
