export const BASE_URL = "https://api.ecoledirecte.com/v3";
export const API_VERSION = "7.8.2";
export const DEFAULT_USER_AGENT = `wrapDirecte/1.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148  EDMOBILE v${API_VERSION}`;

export interface EDResponse<T> {
    code: number;
    token?: string;
    message: string;
    data: T;
}

export class EDError extends Error {
    constructor(public code: number, message: string) {
        super(message);
        this.name = "EDError";
    }
}

export class EDAuthError extends EDError {}
export class EDRateLimitError extends EDError {}
export class EDModuleDisabledError extends Error {
    constructor(moduleCode: string) {
        super(`Module ${moduleCode} is disabled for this account.`);
        this.name = "EDModuleDisabledError";
    }
}
