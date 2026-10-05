/** Conventional Commits — see docs/DEVELOPMENT_GUIDE.md#commit-messages */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [1, 'always', ['api', 'dashboard', 'shared', 'docs', 'ci', 'deps', 'db', 'infra']],
  },
};
