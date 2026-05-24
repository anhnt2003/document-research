import { ActivityEvent } from '../../models';

export const ACTIVITY: ActivityEvent[] = [
  { id: 'a-1', userId: 'u-anh', action: 'Đăng nhập', at: '2026-05-24T07:48:00Z' },
  { id: 'a-2', userId: 'u-anh', action: 'Tìm kiếm', target: '"pgvector benchmark"', at: '2026-05-24T07:42:00Z' },
  { id: 'a-3', userId: 'u-anh', action: 'Xem tài liệu', target: 'DOC-K7184 · pgvector trong thực chiến', at: '2026-05-24T07:41:00Z' },
  { id: 'a-4', userId: 'u-anh', action: 'Cập nhật metadata', target: 'DOC-S2104 · Báo cáo tiến độ tháng 5', at: '2026-05-23T22:00:00Z' },
  { id: 'a-5', userId: 'u-anh', action: 'Tải lên', target: 'Báo cáo tiến độ tháng 5.docx', at: '2026-05-22T18:00:00Z' },
  { id: 'a-6', userId: 'u-anh', action: 'Đăng nhập', at: '2026-05-22T08:11:00Z' },
  { id: 'a-7', userId: 'u-anh', action: 'Phân quyền', target: 'Vai trò Thủ thư → +chức năng "Xóa tài liệu"', at: '2026-05-19T15:20:00Z' },
  { id: 'a-8', userId: 'u-anh', action: 'Mời người dùng', target: 'thu.np@hubt.edu.vn', at: '2026-05-18T10:00:00Z' },
];
