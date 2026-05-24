import { User } from '../../models';
import { makeInitials, pickAccent } from '../../util/signature';

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
    initials: makeInitials(displayName),
    avatarColor: pickAccent(id),
    locale: 'vi',
    status: 'active',
    roleIds,
    createdAt: '2025-09-12T08:00:00Z',
    lastLoginAt: '2026-05-23T22:14:00Z',
    title: 'Nghiên cứu viên',
    department: 'Khoa CNTT',
    ...extra,
  };
}

export const USERS: User[] = [
  mk('u-anh', 'anh.nt15@kiotviet.com', 'Nguyễn Tuấn Anh', ['role-admin'], {
    title: 'Quản trị hệ thống',
    department: 'Khoa CNTT',
    lastLoginAt: '2026-05-24T07:48:00Z',
  }),
  mk('u-hoa', 'hoa.lt@hubt.edu.vn', 'Lê Thị Hoa', ['role-editor', 'role-librarian'], {
    title: 'Giảng viên',
    department: 'Khoa CNTT',
  }),
  mk('u-minh', 'minh.dn@hubt.edu.vn', 'Đỗ Nguyễn Minh', ['role-editor'], {
    title: 'Trợ giảng',
    department: 'Khoa Kinh tế',
  }),
  mk('u-trang', 'trang.pt@hubt.edu.vn', 'Phạm Thị Trang', ['role-viewer'], {
    title: 'Sinh viên K27',
  }),
  mk('u-bao', 'bao.vh@hubt.edu.vn', 'Vũ Hoàng Bảo', ['role-viewer'], {
    title: 'Sinh viên K27',
  }),
  mk('u-linh', 'linh.nk@hubt.edu.vn', 'Nguyễn Khánh Linh', ['role-librarian'], {
    title: 'Cán bộ thư viện',
    department: 'Thư viện trung tâm',
  }),
  mk('u-quan', 'quan.tt@hubt.edu.vn', 'Trần Tuấn Quân', ['role-editor'], {
    title: 'Nghiên cứu sinh',
    status: 'locked',
  }),
  mk('u-thu', 'thu.np@hubt.edu.vn', 'Nguyễn Phương Thu', ['role-viewer'], {
    title: 'Sinh viên K28',
    status: 'invited',
    lastLoginAt: undefined,
  }),
];

export const CURRENT_USER_ID = 'u-anh';
