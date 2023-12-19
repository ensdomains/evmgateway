export interface Router {
  handle: (request: Request) => Promise<boolean>;
}
