/**
 * Message processor interface.
 * Implement this interface to create custom message processors.
 */
export interface MessageProcessor {
    /**
     * Processes a message payload.
     * @param payload - The message payload to process
     */
    process(payload: Record<string, unknown>): Promise<void>;
}
