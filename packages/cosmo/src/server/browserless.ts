import { ofetch } from "ofetch";

export interface BrowserlessConfig {
  baseUrl: string;
  apiKey: string;
}

/**
 * Create an HTTP client for Browserless.
 */
export function createBrowserlessClient(config: BrowserlessConfig) {
  return ofetch.create({
    baseURL: config.baseUrl,
    query: {
      token: config.apiKey,
    },
    retry: false,
  });
}
