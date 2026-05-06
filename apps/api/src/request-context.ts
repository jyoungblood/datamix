import { AsyncLocalStorage } from "node:async_hooks";

type BackgroundExecutionContext = {
  waitUntil: (promise: Promise<unknown>) => void;
};

const executionContextStorage = new AsyncLocalStorage<BackgroundExecutionContext>();

export function runWithExecutionContext<T>(
  executionContext: BackgroundExecutionContext,
  callback: () => T,
) {
  return executionContextStorage.run(executionContext, callback);
}

export function getExecutionContext() {
  return executionContextStorage.getStore() ?? null;
}
