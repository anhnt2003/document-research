namespace DocumentResearch.Api.Permissions;

public sealed record PermissionDescriptor(string Key, string Group, string Label, string Description);

public static class PermissionCatalog
{
    public static IReadOnlyList<PermissionDescriptor> All { get; } =
    [
        new("documents:read",   "documents", "Đọc tài liệu",       "Xem danh sách và nội dung tài liệu."),
        new("documents:write",  "documents", "Quản lý tài liệu",   "Tạo, sửa, xoá tài liệu."),
        new("tags:read",        "documents", "Đọc thẻ",            "Xem danh sách thẻ và thẻ của tài liệu."),
        new("tags:write",       "documents", "Quản lý thẻ",        "Tạo, sửa, xoá thẻ và gán/gỡ thẻ trên tài liệu."),
        new("users:read",       "admin",     "Xem người dùng",     "Xem danh sách tài khoản và phân quyền."),
        new("users:write",      "admin",     "Quản lý người dùng", "Mời, khoá, gán role cho tài khoản."),
        new("roles:manage",     "admin",     "Quản lý vai trò",    "Tạo và chỉnh sửa vai trò + permission."),
        new("audit:read",       "admin",     "Xem nhật ký hệ thống", "Truy cập activity log toàn hệ thống."),
    ];
}
