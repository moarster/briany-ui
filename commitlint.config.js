/**
 * Conventional Commits, mirroring briany-contract: the same types and the same PascalCase
 * scope rule, so a change that spans both repositories reads the same way in each history.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'refactor', 'chore', 'ci', 'test', 'perf']],
    'scope-case': [2, 'always', 'pascal-case'],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
  },
}
