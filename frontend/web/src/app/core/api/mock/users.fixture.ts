import { User } from '../../models';

function mk(
  id: string,
  email: string,
  displayName: string,
  roleIds: string[],
  extra: Partial<User> = {}
): User {
  return {
    id,
    email,
    displayName,
    avatarUrl: null,
    status: 'active',
    roleIds,
    createdAt: '2025-09-12T08:00:00Z',
    lastLoginAt: '2026-05-23T22:14:00Z',
    ...extra,
  };
}

export const USERS: User[] = [
  mk('u-anh', 'anh.nt15@kiotviet.com', 'Nguyễn Tuấn Anh', ['role-admin'], {
    lastLoginAt: '2026-05-24T07:48:00Z',
  }),
  mk('u-hoa', 'hoa.lt@hubt.edu.vn', 'Lê Thị Hoa', ['role-editor', 'role-librarian']),
  mk('u-minh', 'minh.dn@hubt.edu.vn', 'Đỗ Nguyễn Minh', ['role-editor']),
  mk('u-trang', 'trang.pt@hubt.edu.vn', 'Phạm Thị Trang', ['role-viewer']),
  mk('u-bao', 'bao.vh@hubt.edu.vn', 'Vũ Hoàng Bảo', ['role-viewer']),
  mk('u-linh', 'linh.nk@hubt.edu.vn', 'Nguyễn Khánh Linh', ['role-librarian']),
  mk('u-quan', 'quan.tt@hubt.edu.vn', 'Trần Tuấn Quân', ['role-editor'], {
    status: 'locked',
  }),
  mk('u-thu', 'thu.np@hubt.edu.vn', 'Nguyễn Phương Thu', ['role-viewer'], {
    status: 'invited',
    lastLoginAt: null,
  }),
];

export const CURRENT_USER_ID = 'u-anh';
