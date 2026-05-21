import { fileExists, readFile, writeFile } from "@api/native/fs";
import { debounce } from "es-toolkit";

const LOG_FILE = "public/message_logs.json";
const MAX_LOGS = 1000;

export interface MessageLogEntry {
    timestamp: string;
    type: "DELETE" | "UPDATE";
    messageId: string;
    channelId: string;
    author: {
        id: string;
        username: string;
        discriminator: string;
        bot: boolean;
    };
    content: string;
    attachments: string[];
}

interface LogData {
    version: number;
    logs: MessageLogEntry[];
}

let cachedLogData: LogData | null = null;

const flushLogsToDisk = debounce(async () => {
    if (cachedLogData) {
        await writeFile(LOG_FILE, JSON.stringify(cachedLogData));
    }
}, 1500);

// Sync — JSON.parse is synchronous, no need for async wrapper
function safeParse(data: string | null): LogData | MessageLogEntry[] | null {
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

function normalise(parsed: LogData | MessageLogEntry[] | null): LogData {
    if (!parsed) return { version: 1, logs: [] };
    if (Array.isArray(parsed)) return { version: 1, logs: parsed };
    return parsed;
}

// Sync — only does in-memory assignment + debounce enqueue
function writeLogData(data: LogData): void {
    cachedLogData = data;
    flushLogsToDisk();
}

async function readLogData(): Promise<LogData> {
    if (cachedLogData) return cachedLogData;

    const exists = await fileExists(LOG_FILE);
    if (!exists) {
        cachedLogData = { version: 1, logs: [] };
        return cachedLogData;
    }

    const content = await readFile(LOG_FILE);
    cachedLogData = normalise(safeParse(content));
    return cachedLogData;
}

export async function addLogEntry(entry: MessageLogEntry): Promise<void> {
    const data = await readLogData();

    if (data.logs.length >= MAX_LOGS) {
        data.logs.shift();
    }

    data.logs.push(entry);
    writeLogData(data);
}

export async function getLogEntries(
    filter?: {
        channelId?: string;
        authorId?: string;
        type?: "DELETE" | "UPDATE";
    },
    limit = 100
): Promise<MessageLogEntry[]> {
    const data = await readLogData();
    let entries = data.logs;

    // Single-pass filter avoids up to 3 intermediate arrays
    if (filter?.channelId || filter?.authorId || filter?.type) {
        const { channelId, authorId, type } = filter!;
        entries = entries.filter(e =>
            (!channelId || e.channelId === channelId) &&
            (!authorId || e.author.id === authorId) &&
            (!type || e.type === type)
        );
    }

    return entries.slice(-limit);
}

export async function getLogEntry(messageId: string): Promise<MessageLogEntry | null> {
    const data = await readLogData();
    return data.logs.find(e => e.messageId === messageId) ?? null;
}

export async function clearLogs(): Promise<void> {
    cachedLogData = { version: 1, logs: [] };
    await writeFile(LOG_FILE, JSON.stringify(cachedLogData));
}

function isValidEntry(log: any): log is MessageLogEntry {
    return (
        log != null &&
        typeof log.messageId === "string" &&
        typeof log.channelId === "string" &&
        typeof log.timestamp === "string" &&
        typeof log.type === "string"
    );
}

export async function repairCorruptedLogs(): Promise<boolean> {
    try {
        const exists = await fileExists(LOG_FILE);
        if (!exists) return true;

        const content = await readFile(LOG_FILE);
        const validLogs = normalise(safeParse(content)).logs.filter(isValidEntry);
        writeLogData({ version: 1, logs: validLogs });
        return true;
    } catch {
        return false;
    }
}
