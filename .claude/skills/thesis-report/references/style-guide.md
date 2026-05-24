# Thesis Style Guide — HUBT, Khoa CNTT, Khóa 27

**Mục đích**: Single source of truth cho mọi yêu cầu format báo cáo. Claude đọc file này TRƯỚC khi sinh hoặc sửa nội dung trong `docs/report.docx`.

**Nguồn**: Lấy từ 2 file template trong cùng thư mục (`../assets/school-structure-guide.docx` và `../assets/cover-template.docx`). Quy ước:

- `**CONFIRMED:**` — giá trị trích trực tiếp từ template trường. Không đổi.
- `**BEST PRACTICE:**` — giá trị mặc định theo chuẩn báo cáo đồ án CNTT VN, do template trường không nêu rõ. **GVHD có thể override.** Nếu GVHD yêu cầu giá trị khác, sửa tại đây — không sửa ở chỗ khác (đây là single source of truth).

---

## 0. Thông tin trường

- Trường: **Đại học Kinh doanh và Công nghệ Hà Nội**
- Khoa: **Công nghệ Thông tin**
- Khóa: **27**
- Năm bảo vệ: **2026** (theo mẫu bìa)

## 1. Trang giấy & lề

- Khổ giấy: **CONFIRMED: A4 (21 × 29.7 cm)** — lấy từ `../assets/cover-template.docx`
- Lề trái: **CONFIRMED: 3.5 cm** (đóng quyển)
- Lề phải: **CONFIRMED: 2.2 cm**
- Lề trên: **CONFIRMED: 2.2 cm**
- Lề dưới: **CONFIRMED: 2.2 cm**
- Hướng: Portrait
- Đánh số trang: **BEST PRACTICE: dưới-giữa (bottom-center)**. Phần đầu (lời cảm ơn, mục lục) dùng số La Mã thường (i, ii, iii); từ Chương 1 dùng số Ả Rập (1, 2, 3). Trang bìa **không đánh số**.

> ℹ️ Lưu ý: File `../assets/school-structure-guide.docx` của trường ghi page size Letter (21.59 × 27.94 cm) — đây gần như chắc chắn là default Word lúc soạn template, **không phải** quy định. Báo cáo chính thức luôn dùng A4.

## 2. Font chữ

| Đối tượng | Font | Size | Style |
| --- | --- | --- | --- |
| Body text | **CONFIRMED:** Times New Roman | **CONFIRMED:** 14pt | Regular |
| Chương (Heading 1, ví dụ "CHƯƠNG 1: GIỚI THIỆU") | Times New Roman | 14pt | **CONFIRMED: Bold, UPPERCASE** |
| Mục lớn (Heading 2, ví dụ "1.1.") | Times New Roman | 14pt | **BEST PRACTICE: Bold** |
| Mục con (Heading 3, ví dụ "1.1.1.") | Times New Roman | 14pt | **BEST PRACTICE: Bold Italic** |
| Caption hình/bảng | Times New Roman | **BEST PRACTICE: 12pt** | **BEST PRACTICE: Italic** |
| Code/listing | **BEST PRACTICE: Consolas** (fallback Courier New) | **BEST PRACTICE: 11pt** | Regular |
| Trang bìa — "ĐỒ ÁN TỐT NGHIỆP" | **CONFIRMED:** Times New Roman | **CONFIRMED: 25pt** | Bold |
| Trang bìa — "Đề Tài:" + Tên đề tài | Times New Roman | **CONFIRMED: 16pt** | Bold |
| Trang bìa — "(NGÀNH: CÔNG NGHỆ THÔNG TIN)" | Times New Roman | **CONFIRMED: 12pt** | Bold |
| Trang bìa — thông tin sinh viên | Times New Roman | **CONFIRMED: 16pt** | Bold |

## 3. Spacing & indent

- Line spacing: **BEST PRACTICE: 1.5** (chuẩn báo cáo đồ án TN ở VN)
- Spacing before paragraph: **BEST PRACTICE: 6pt**
- Spacing after paragraph: **BEST PRACTICE: 6pt**
- First-line indent: **BEST PRACTICE: 1 cm** (chỉ áp dụng body text; không indent cho heading, caption, list item, code block)
- Alignment: **BEST PRACTICE: Justify (canh đều) cho body**; **Left cho heading**; **Center cho caption hình/bảng, công thức**

## 4. Đánh số chương và mục

- Chương: **CONFIRMED:** `CHƯƠNG 1:`, `CHƯƠNG 2:` (chữ in hoa, có dấu hai chấm sau số chương)
- Tên chương: **CONFIRMED: UPPERCASE** (vd: `CHƯƠNG 2: CƠ SỞ LÝ THUYẾT & CÔNG NGHỆ`)
- Mục lớn: `1.1.`, `1.2.`, ... (dạng `<chương>.<mục>.`)
- Mục con: `1.1.1.`, `1.1.2.`, ...
- Tối đa: **BEST PRACTICE: 3 cấp (1.1.1)** — không dùng 1.1.1.1 hoặc sâu hơn vì khó đọc trong mục lục và làm vỡ layout heading.

## 5. Hình & bảng

- Caption hình: **BEST PRACTICE: phía DƯỚI hình**, format `Hình <chương>.<số>. <Mô tả>` (vd: `Hình 2.1. Sơ đồ kiến trúc tổng quát`). Caption italic, alignment center.
- Caption bảng: **BEST PRACTICE: phía TRÊN bảng**, format `Bảng <chương>.<số>. <Mô tả>`. Caption italic, alignment center.
- Đánh số: **theo chương**, restart mỗi chương (Hình 2.1, 2.2, … rồi Hình 3.1, …). Tương tự cho Bảng.
- Tham chiếu trong văn bản: `như Hình 2.1 cho thấy...`, `xem Bảng 3.2`. Không viết "hình bên dưới" / "bảng ở trên" — luôn dùng số tham chiếu cụ thể.
- Hình ảnh phải kèm **nguồn** nếu không phải tự sinh (cuối caption, ví dụ: `Hình 2.1. Sơ đồ kiến trúc transformer (Nguồn: Vaswani et al., 2017)`).

## 6. Citation & tài liệu tham khảo

- Citation style: **BEST PRACTICE: IEEE numbered `[1]`, `[2]`** — chuẩn phổ biến nhất cho đồ án CNTT/Kỹ thuật ở Việt Nam, dễ trích nhiều nguồn liên tiếp `[1, 3, 5]`, ngắn gọn trong body.
- Vị trí citation: **cuối câu, trước dấu chấm** (ví dụ: `... đạt độ chính xác 92% [3].`)
- Khi dẫn nhiều nguồn: `[1, 3, 5]` (không phải `[1], [3], [5]`).
- Danh mục TLTK: cuối báo cáo, **sắp xếp theo thứ tự xuất hiện trong báo cáo** (chuẩn IEEE — KHÔNG alphabet).
- Format từng loại nguồn (IEEE):
  - Bài báo tạp chí: `[N] A. B. Tác giả, "Tiêu đề bài báo," <i>Tên tạp chí (in nghiêng)</i>, vol. X, no. Y, pp. Z-W, năm.`
  - Sách: `[N] A. B. Tác giả, <i>Tiêu đề sách (in nghiêng)</i>, ấn bản, NXB, năm.`
  - Hội nghị: `[N] A. B. Tác giả, "Tiêu đề," in <i>Tên kỷ yếu (in nghiêng)</i>, địa điểm, năm, pp. X-Y.`
  - Website / báo điện tử: `[N] A. B. Tác giả (hoặc Tổ chức), "Tiêu đề," <i>Tên trang</i>, ngày tháng năm. [Online]. Available: <URL>. Truy cập: ngày tháng năm.`
- Mọi nguồn được trích trong body PHẢI có trong danh mục TLTK, và ngược lại — không liệt kê nguồn không trích.

## 7. Tiếng & văn phong

- Ngôn ngữ: tiếng Việt (academic register).
- Thuật ngữ tiếng Anh khi giới thiệu lần đầu: in nghiêng, kèm dịch tiếng Việt trong ngoặc. Ví dụ: *embedding* (vector biểu diễn).
- Không dùng ngôi nhân xưng "tôi" / "em" trong body — dùng "tác giả" hoặc bị động.

## 8. Cấu trúc bắt buộc (lấy từ file Hướng dẫn của trường)

### Phần mở đầu (đánh số La Mã)

1. Trang bìa cứng + bìa mềm (xem `../assets/cover-template.docx`)
2. Lời nói đầu
3. Lời cam đoan
4. Lời cảm ơn
5. Mục lục (tự sinh từ heading)
6. Danh mục bảng / hình
7. Danh mục từ viết tắt

### Phần nội dung (đánh số Ả Rập, xem [chapter-structure.md](chapter-structure.md))

- Chương 1: GIỚI THIỆU
- Chương 2: CƠ SỞ LÝ THUYẾT & CÔNG NGHỆ
- Chương 3: PHÂN TÍCH & THIẾT KẾ
- Chương 4: XÂY DỰNG & TRIỂN KHAI
- Chương 5: ĐÁNH GIÁ & KẾT LUẬN

### Phần cuối

- Tài liệu tham khảo
- Phụ lục (nếu có)

## 9. Độ dài

- Tối thiểu: **BEST PRACTICE: 50 trang** (nội dung Chương 1 → Chương 5)
- Tối đa: **BEST PRACTICE: 80 trang** (nội dung); nếu thực sự cần dài hơn → đẩy chi tiết kỹ thuật/code dài vào Phụ lục.
- Không tính: bìa, lời cảm ơn, lời cam đoan, mục lục, danh mục hình/bảng/viết tắt, tài liệu tham khảo, phụ lục.
- Phân bổ gợi ý: Chương 1 ~8-12 tr · Chương 2 ~12-18 tr · Chương 3 ~12-18 tr · Chương 4 ~12-18 tr · Chương 5 ~4-6 tr.

## 10. Quy định đặt tên đề tài (từ hướng dẫn của trường)

Tùy chuyên ngành, tên đề tài nên bắt đầu bằng các cụm sau (trích nguyên văn):

- **AI**: "Xây dựng hệ thống … sử dụng học máy"
- **An ninh mạng**: "Nghiên cứu và xây dựng hệ thống …"
- **Blockchain**: "Ứng dụng công nghệ Blockchain trong …"
- **Phần mềm**: "Phân tích, thiết kế và xây dựng hệ thống …"
- **Mạng**: "Thiết kế và xây dựng hệ thống LAN theo …"

Project này thuộc nhóm **AI / Phần mềm** → đề tài nên bắt đầu bằng "Xây dựng hệ thống ..." hoặc "Phân tích, thiết kế và xây dựng hệ thống ...".

## 11. Trang bìa — chuỗi chính xác (từ template)

Thứ tự dòng trên trang bìa (giữ nguyên kiểu chữ in HOA và bold):

```text
BỘ GIÁO DỤC VÀ ĐÀO TẠO              ← 14pt, bold, center   [BEST PRACTICE]
TRƯỜNG ĐẠI HỌC KINH DOANH VÀ CÔNG NGHỆ HÀ NỘI   ← 14pt, bold, center  [BEST PRACTICE]
KHOA CÔNG NGHỆ THÔNG TIN            ← 14pt, bold, center   [BEST PRACTICE]

[logo trường]                       ← ~3-4 cm, center

ĐỒ ÁN TỐT NGHIỆP                    ← 25pt, bold, center   [CONFIRMED]
(NGÀNH: CÔNG NGHỆ THÔNG TIN)        ← 12pt, bold, center   [CONFIRMED]

Đề Tài:                             ← 16pt, bold, center   [CONFIRMED]
<TÊN ĐỀ TÀI IN HOA>                 ← 16pt, bold, center   [CONFIRMED]

Sinh viên thực hiện     : ...       ← 16pt, bold, LEFT-aligned (khối canh giữa trang, dấu “:” thẳng cột)
Mã sinh viên            : ...       ← 16pt, bold, LEFT-aligned
Lớp                     : ...       ← 16pt, bold, LEFT-aligned
Giảng viên hướng dẫn    : ...       ← 16pt, bold, LEFT-aligned

Hà Nội - 2026                       ← 16pt, bold, center   [CONFIRMED]
```

> 3 dòng header (BỘ GIÁO DỤC / TRƯỜNG / KHOA) ở size 14pt là BEST PRACTICE — template trường không nêu rõ. Khi đóng quyển, nếu thấy quá lớn so với khối dưới, có thể giảm về 13pt (sửa ngay ở mục này).
