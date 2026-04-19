import { Client } from "@ridit/relay/client";

export function createClient(monaco: any) {
  const client = new Client(monaco);
  return client;
}
