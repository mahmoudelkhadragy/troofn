import { PermissionScope, Role } from '@troofn/shared';
import type { AccessContext } from '../access-context.js';
import { clientScopeWhere } from './client-scope.js';

const base: Omit<AccessContext, 'scope'> = {
  userId: 'user-1',
  role: Role.MARKETING_MANAGER,
  clientId: null,
};

describe('clientScopeWhere', () => {
  it('ALL → no filter', () => {
    expect(clientScopeWhere({ ...base, scope: PermissionScope.ALL })).toEqual({});
  });

  it('ASSIGNED → clients whose team includes the user', () => {
    expect(clientScopeWhere({ ...base, scope: PermissionScope.ASSIGNED })).toEqual({
      team: { some: { userId: 'user-1' } },
    });
  });

  it("OWN_CLIENT → only the user's own company", () => {
    const access = {
      ...base,
      role: Role.CLIENT,
      clientId: 'client-9',
      scope: PermissionScope.OWN_CLIENT,
    };
    expect(clientScopeWhere(access)).toEqual({ id: 'client-9' });
  });

  it('OWN_CLIENT without a company → matches nothing (fails closed)', () => {
    expect(clientScopeWhere({ ...base, scope: PermissionScope.OWN_CLIENT })).toEqual({
      id: { in: [] },
    });
  });

  it('OWN does not apply to clients → matches nothing (fails closed)', () => {
    expect(clientScopeWhere({ ...base, scope: PermissionScope.OWN })).toEqual({ id: { in: [] } });
  });
});
