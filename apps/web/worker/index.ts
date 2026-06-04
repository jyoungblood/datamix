import handler from "vinext/server/app-router-entry";
import { runWithExecutionContext } from "vinext/shims/request-context";

export default {
  async fetch(request, env, ctx) {
    return runWithExecutionContext(ctx, () => handler.fetch(request, env, ctx));
  },
} satisfies ExportedHandler<Env>;
