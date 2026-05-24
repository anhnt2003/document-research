import { Permission } from '../../models';

export const PERMISSIONS: Permission[] = [
  { key: 'document.read', group: 'document', label: 'Xem tài liệu', description: 'Đọc tài liệu thuộc phạm vi được phân quyền.' },
  { key: 'document.write', group: 'document', label: 'Tạo / chỉnh sửa tài liệu', description: 'Tải lên, cập nhật nội dung và metadata.' },
  { key: 'document.delete', group: 'document', label: 'Xóa tài liệu', description: 'Xóa tài liệu hoặc đưa vào thùng rác.' },
  { key: 'document.share', group: 'document', label: 'Chia sẻ tài liệu', description: 'Đổi visibility hoặc cấp quyền cho người khác.' },
  { key: 'user.view', group: 'user', label: 'Xem danh sách người dùng', description: 'Truy cập danh bạ và thông tin cơ bản.' },
  { key: 'user.manage', group: 'user', label: 'Quản lý người dùng', description: 'Mời, khóa, cập nhật vai trò người dùng.' },
  { key: 'role.manage', group: 'role', label: 'Quản lý vai trò', description: 'Tạo, sửa, xóa vai trò và phân quyền.' },
  { key: 'permission.view', group: 'role', label: 'Xem danh mục quyền', description: 'Tham khảo bộ quyền hệ thống.' },
  { key: 'search.execute', group: 'search', label: 'Thực hiện tìm kiếm', description: 'Tra cứu tài liệu bằng từ khóa hoặc ngữ nghĩa.' },
  { key: 'search.history.view', group: 'search', label: 'Xem lịch sử tìm kiếm', description: 'Xem và chạy lại các truy vấn trước đây.' },
  { key: 'system.admin', group: 'system', label: 'Quản trị hệ thống', description: 'Cấu hình hệ thống, cấp phép, audit log.' },
];
