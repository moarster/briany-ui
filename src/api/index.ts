/**
 * The API boundary. Feature code imports from here and never from `./generated`, so a
 * contract reshape has exactly one place to be absorbed.
 */
export * from './generated/types.gen'
export * from './generated/sdk.gen'
export * from './generated/@tanstack/react-query.gen'
export { client, configureApiHandlers } from './client'
export {
  ProblemError,
  isProblemError,
  isNotFound,
  hasCode,
  groupErrorsByField,
  parseDeployErrors,
} from './problem'
export type { DeployErrorTarget } from './problem'
export * from './queries'
