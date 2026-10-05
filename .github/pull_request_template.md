## What & why

<!-- What does this PR change, and why? Link the roadmap item / issue. -->

## Type

- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] refactor / chore / docs / test

## Area

- [ ] api
- [ ] dashboard
- [ ] shared
- [ ] infra / ci / docs

## Checklist

- [ ] Branch is up to date with `develop`
- [ ] `pnpm lint` and `pnpm test` pass locally
- [ ] New endpoints have DTO validation, `@Roles()` and an ownership check
- [ ] New endpoints are documented in Swagger (and in `docs/04-api-conventions.md` if new module)
- [ ] Prisma migration included (if the schema changed)
- [ ] New UI text exists in both `ar.json` and `en.json`, and the page was checked in RTL
- [ ] No secrets, `.env` files or debug logs committed

## Screenshots (UI changes)
