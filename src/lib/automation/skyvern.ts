type SkyvernWorkflowStatus = 'pending' | 'running' | 'success' | 'failed' | 'error';

interface SkyvernWorkflowConfig {
    url: string;
    workflow_id?: string;
    navigation_goal?: string;
    data_extraction_goal?: string;
    max_retries?: number;
}

interface SkyvernRunResponse {
    run_id: string;
    status: SkyvernWorkflowStatus;
    result?: unknown;
    error_message?: string;
}

export class SkyvernClient {
    private apiKey: string;
    private baseUrl = 'https://api.skyvern.com/v1';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.SKYVERN_API_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️ SKYVERN_API_KEY is not set. Automation will fail.');
        }
    }

    /**
     * Execute a workflow with retry logic for form submissions
     */
    async createWorkflow(config: SkyvernWorkflowConfig, retries = 3): Promise<SkyvernRunResponse> {
        let attempt = 0;
        let lastError: unknown;

        while (attempt < retries) {
            try {
                attempt++;
                if (attempt > 1) {
                    console.log(`🔄 Retrying Skyvern workflow (Attempt ${attempt}/${retries})...`);
                    // Exponential backoff: 1s, 2s, 4s
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 2)));
                }

                const response = await fetch(`${this.baseUrl}/runs`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: config.url,
                        workflow_id: config.workflow_id,
                        navigation_goal: config.navigation_goal,
                        data_extraction_goal: config.data_extraction_goal,
                    }),
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`Skyvern API error ${response.status}: ${errorBody}`);
                }

                const data = await response.json();
                return {
                    run_id: data.run_id,
                    status: 'pending', // Starts as pending
                };

            } catch (error) {
                console.error(`❌ Skyvern attempt ${attempt} failed:`, error);
                lastError = error;

                // Don't retry if it's a 4xx error (client error), except 429 (rate limit)
                if (error instanceof Error && error.message.includes('4') && !error.message.includes('429')) {
                    throw error;
                }
            }
        }

        throw new Error(`Failed to create Skyvern workflow after ${retries} attempts. Last error: ${lastError}`);
    }

    async getRunStatus(runId: string): Promise<{ status: string;[key: string]: unknown }> {
        try {
            const response = await fetch(`${this.baseUrl}/runs/${runId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to check run status: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                run_id: data.run_id,
                status: data.status,
                result: data.outputs,
                error_message: data.error_message,
            };
        } catch (error) {
            console.error(`❌ Failed to get run status for ${runId}:`, error);
            throw error;
        }
    }
}

export const skyvern = new SkyvernClient();
