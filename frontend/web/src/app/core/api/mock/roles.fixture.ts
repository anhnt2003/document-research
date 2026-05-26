import { Role } from '../../models';
import { PERMISSIONS } from './permissions.fixture';

const allKeys = PERMISSIONS.map((p) => p.key);

export const ROLES: Role[] = [
  {
    id: 'role-admin',
    name: 'Quản trị viên',
    description: 'Toàn quyền quản trị hệ thống, người dùng và tài liệu.',
    permissionKeys: allKeys,
    isSystem: true,
  },
  {
    id: 'role-editor',
    name: 'Biên tập viên',
    description: 'Tải lên và biên tập tài liệu, tìm kiếm, xem người dùng.',
    permissionKeys: [
      'document.read',
      'document.write',
      'document.share',
      'user.view',
      'search.execute',
      'search.history.view',
      'permission.view',
    ],
    isSystem: true,
  },
  {
    id: 'role-viewer',
    name: 'Người đọc',
    description: 'Chỉ đọc tài liệu, tìm kiếm và xem lịch sử cá nhân.',
    permissionKeys: ['document.read', 'search.execute', 'search.history.view'],
    isSystem: true,
  },
  {
    id: 'role-librarian',
    name: 'Thủ thư',
    description: 'Quản lý taxonomy, kiểm duyệt tài liệu, chia sẻ.',
    permissionKeys: [
      'document.read',
      'document.write',
      'document.share',
      'document.delete',
      'search.execute',
      'search.history.view',
      'permission.view',
    ],
    isSystem: false,
  },
];
