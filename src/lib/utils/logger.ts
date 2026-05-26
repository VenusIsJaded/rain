import { findByNameLazy } from "@metro/wrappers";

type LoggerFunction = (...messages: any[]) => void;
export interface Logger {
    log: LoggerFunction;
    info: LoggerFunction;
    warn: LoggerFunction;
    error: LoggerFunction;
    time: LoggerFunction;
    trace: LoggerFunction;
    verbose: LoggerFunction;
}

export const LoggerClass = findByNameLazy("Logger");
export const logger: Logger = new LoggerClass("Rain");

import { isPerfMode } from "@api/perf-switch";

// Wrap logger methods to respect the performance toggle
const wrap = (fn: LoggerFunction) => (...args: any[]) => { if (!isPerfMode) fn(...args); };
logger.log = wrap(logger.log.bind(logger));
logger.info = wrap(logger.info.bind(logger));
logger.warn = wrap(logger.warn.bind(logger));
logger.verbose = wrap(logger.verbose.bind(logger));
// Keep error, time, and trace always active for critical debugging

