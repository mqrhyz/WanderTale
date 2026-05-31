import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "playwright";

const scriptsDir = join(dirname(fileURLToPath(import.meta.url)), "scripts");

const cache = new Map<string, string>();

function loadScript(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;
  const source = readFileSync(join(scriptsDir, name), "utf8");
  cache.set(name, source);
  return source;
}

/**
 * Chạy file .js thuần trong browser — tránh esbuild `__name` khi dùng tsx.
 */
export async function runBrowserScript<T>(page: Page, scriptFile: string, arg?: unknown): Promise<T> {
  const source = loadScript(scriptFile);
  return page.evaluate(
    function (params: { source: string; arg: unknown }) {
      const fn = new Function("arg", params.source + "\nreturn main(arg);");
      return fn(params.arg) as T;
    },
    { source, arg }
  ) as Promise<T>;
}
