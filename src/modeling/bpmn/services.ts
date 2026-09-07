/**
 * bpmn-js and dmn-js resolve their services through a didi injector, whose `get` is
 * generic and returns `unknown` without a type argument. Every service this application
 * touches is untyped upstream, so one accessor states that once here rather than each call
 * site carrying a cast.
 */
export type DiagramHost = { get: (name: string) => unknown }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function service<T = any>(host: DiagramHost, name: string): T {
  return host.get(name) as T
}
