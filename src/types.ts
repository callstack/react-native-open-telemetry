export interface Options {
  version?: string;
  name?: string;
  environment?: string;
  url?: string;
  headers?: Record<string, string>;
  debug?: boolean;
  native?: boolean;
  features?: {
    session?: {
      getSessionId: () => string | null;
    };
  };
}
