export enum LogLevel {
    DEBUG = "DEBUG",
    INFO  = 'INFO',
    WARN  = 'WARN',
    ERROR = 'ERROR',
    FATAL = "FATAL",
    ALERT = "ALERT",
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string,any>; 
    error?: unknown;
}
