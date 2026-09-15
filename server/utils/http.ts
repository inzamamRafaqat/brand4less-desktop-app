/**
 * Express 5's `ParamsDictionary` types route params as `string | string[]`
 * (a splat param like `/x/*rest` is an array). Our routes only use simple
 * `:name` params, so this normalises the value back to a single string.
 */
export function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
