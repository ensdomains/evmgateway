import { Request as CFWRequest } from '@cloudflare/workers-types';

export interface Router {
  handle: (request: CFWRequest) => Promise<Response>;
}
