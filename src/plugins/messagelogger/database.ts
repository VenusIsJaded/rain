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

function safeParse(data: string | null): LogData | MessageLogEntry[] | null {
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}

function normaliseLogData(parsed: LogData | MessageLogEntry[] | null): LogData {
    if (!parsed) return { version: 1, logs: [] };
    if (Array.isArray(parsed)) return { version: 1, logs: parsed };
    return parsed;
}

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
    cachedLogData = normaliseLogData(safeParse(content));
    return cachedLogData;
}

export async function addLogEntry(entry: MessageLogEntry): Promise<void> {
    const data = await readLogData();

    if (data.logs.length >= MAX_LOGS) {
        // shift() is O(n); for a ring buffer of 1000 entries it's fine,
        // but splice(0,1) is equivalent and equally fast — keep shift for clarity.
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

    // Apply filters in a single pass to avoid creating multiple intermediate arrays
    if (filter?.channelId || filter?.authorId || filter?.type) {
        const { channelId, authorId, type } = filter!;
        entries = entries.filter(e =>
            (!channelId || e.channelId === channelId) &&
            (!authorId  || e.author.id === authorId) &&
            (!type      || e.type === type)
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

function isValidLogEntry(log: any): log is MessageLogEntry {
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
        const parsed = normaliseLogData(safeParse(content));
        const validLogs = parsed.logs.filter(isValidLogEntry);

        writeLogData({ version: 1, logs: validLogs });
        return true;
    } catch {
        return false;
    }
}
