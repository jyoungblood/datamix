import { app } from "./app";

const worker = {
  fetch: app.fetch,
} satisfies ExportedHandler<Env>;

export default worker;
