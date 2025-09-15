// Simple audit logging implementation
// In a production environment, you'd want to use a proper logging service

export interface AuditLogEntry {
  timestamp: string;
  userId?: number;
  userEmail?: string;
  clientId?: number;
  clientName?: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory

  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // Add to in-memory store
    this.logs.unshift(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Log to console for debugging
    const logLevel = logEntry.success ? 'info' : 'warn';
    console[logLevel](`AUDIT: ${logEntry.action} on ${logEntry.resource}:${logEntry.resourceId} by ${logEntry.userEmail || logEntry.clientName || 'unknown'} - ${logEntry.success ? 'SUCCESS' : 'FAILED'}`);

    // In production, you'd want to:
    // - Send to external logging service (e.g., CloudWatch, Splunk, etc.)
    // - Store in database table
    // - Send alerts for failed authentication attempts
  }

  getLogs(filter?: {
    userId?: number;
    clientId?: number;
    action?: string;
    resource?: string;
    since?: Date;
    success?: boolean;
    limit?: number;
  }): AuditLogEntry[] {
    let filteredLogs = this.logs;

    if (filter) {
      filteredLogs = this.logs.filter(log => {
        if (filter.userId !== undefined && log.userId !== filter.userId) return false;
        if (filter.clientId !== undefined && log.clientId !== filter.clientId) return false;
        if (filter.action && log.action !== filter.action) return false;
        if (filter.resource && log.resource !== filter.resource) return false;
        if (filter.success !== undefined && log.success !== filter.success) return false;
        if (filter.since && new Date(log.timestamp) < filter.since) return false;
        return true;
      });
    }

    const limit = filter?.limit || 100;
    return filteredLogs.slice(0, limit);
  }

  getSecurityEvents(): AuditLogEntry[] {
    return this.getLogs({
      success: false,
      limit: 50,
    }).filter(log => 
      log.action.includes('login') || 
      log.action.includes('auth') ||
      log.action.includes('password')
    );
  }
}

// Global instance
const auditLogger = new AuditLogger();

// Convenience functions for common audit events

export function logUserAction(params: {
  userId: number;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  success: boolean;
  details?: Record<string, any>;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}): void {
  auditLogger.log(params);
}

export function logAPIClientAction(params: {
  clientId: number;
  clientName: string;
  action: string;
  resource: string;
  resourceId: string;
  success: boolean;
  details?: Record<string, any>;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}): void {
  auditLogger.log(params);
}

export function logSecurityEvent(params: {
  userId?: number;
  userEmail?: string;
  clientId?: number;
  clientName?: string;
  action: string;
  success: boolean;
  details?: Record<string, any>;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}): void {
  auditLogger.log({
    ...params,
    resource: 'security',
    resourceId: params.userId?.toString() || params.clientId?.toString() || 'unknown',
  });
}

// Audit log queries
export function getAuditLogs(filter?: {
  userId?: number;
  clientId?: number;
  action?: string;
  resource?: string;
  since?: Date;
  success?: boolean;
  limit?: number;
}): AuditLogEntry[] {
  return auditLogger.getLogs(filter);
}

export function getSecurityEvents(): AuditLogEntry[] {
  return auditLogger.getSecurityEvents();
}

export function getRecentActivity(userId: number, limit: number = 20): AuditLogEntry[] {
  return auditLogger.getLogs({
    userId,
    limit,
    success: true,
  });
}

export default auditLogger;