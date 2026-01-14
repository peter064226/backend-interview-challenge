/**
 * Simple logger utility.
 */
export class Logger {
    constructor(private readonly context: string) { }

    log(message: string): void {
        console.log(`[${this.getTimestamp()}] [${this.context}] ${message}`);
    }

    error(message: string, error?: unknown): void {
        console.error(`[${this.getTimestamp()}] [${this.context}] ❌ ${message}`);
        if (error) {
            console.error(error);
        }
    }

    warn(message: string): void {
        console.warn(`[${this.getTimestamp()}] [${this.context}] ⚠️ ${message}`);
    }

    debug(message: string): void {
        if (process.env.DEBUG === 'true') {
            console.debug(`[${this.getTimestamp()}] [${this.context}] 🔍 ${message}`);
        }
    }

    private getTimestamp(): string {
        return new Date().toISOString().substring(11, 23);
    }
}
