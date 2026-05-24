---
name: thesis-report
description: Use whenever the user mentions "báo cáo", "đồ án", "đồ án tốt nghiệp", "chương 1/2/3/4/5", "phần mở đầu", "kết luận", "lời cảm ơn", "lời cam đoan", "mục lục", "danh mục hình/bảng", "tài liệu tham khảo", "trang bìa"; or asks to viết/draft/sửa/cập nhật/thêm bất kỳ phần nào của báo cáo đồ án; or works with `docs/report.docx`. Enforces the HUBT (Đại học Kinh doanh và Công nghệ Hà Nội) — Khoa CNTT — Khóa 27 thesis template: Times New Roman 14pt body, A4 with 3.5/2.2cm margins, 5 fixed chapters (GIỚI THIỆU / CƠ SỞ LÝ THUYẾT & CÔNG NGHỆ / PHÂN TÍCH & THIẾT KẾ / XÂY DỰNG & TRIỂN KHAI / ĐÁNH GIÁ & KẾT LUẬN), Vietnamese academic register, exact cover page layout. Always reads `references/style-guide.md` and `references/chapter-structure.md` first, then delegates .docx I/O to the document-skills:docx skill. Trigger this skill instead of writing thesis content directly — formatting drift in a thesis is hard to fix late and the report must be approved by GVHD against this exact template.
---

# Thesis Report (HUBT, Khoa CNTT, Khóa 27)

This skill keeps every piece of thesis content aligned with the school's required template. Formatting errors discovered after the report is bound are expensive to fix, so the safety net here is intentionally strict.

## Why this skill exists

The school provides two binding documents, bundled with this skill in `assets/`:

- `assets/school-structure-guide.docx` — original "HƯỚNG DẪN VỀ CẤU TRÚC ĐỒ ÁN TỐT NGHIỆP KHÓA 27" file from the faculty, defining chapter structure.
- `assets/cover-template.docx` — original "MẪU BÌA ĐỒ ÁN TN" file, defining the cover page (font sizes, exact wording, line order).

Their requirements were extracted into two markdown files that act as the *single source of truth* during writing (paths relative to this skill's folder):

- `references/style-guide.md` — font, size, margin, spacing, citation, captions.
- `references/chapter-structure.md` — required 5-chapter layout with Chapter 1's mandatory 7 sections.

Claude must consult these markdown files instead of guessing, because (a) page formatting only looks right when consistent across the whole document and (b) Chapter 1 in particular has a fixed 7-section structure that supervisors actively check.

## Pre-flight: do these three things first, every time

1. **Read `references/style-guide.md`** (inside this skill folder) in full.
2. **Read `references/chapter-structure.md`** (inside this skill folder) in full.
3. **Scan style-guide.md for `FILL IN:` markers.** Some values (line spacing, citation style, caption font, length limits) are not yet decided — they wait for the user's GVHD to confirm. If the section the user wants to write *depends on* an unfilled value, stop and ask the user to confirm that value before proceeding. Examples:
   - Asked to write a chapter body but `Line spacing` is still `FILL IN:` → ask first; spacing affects the whole document.
   - Asked to write the bibliography but `Citation style` is still `FILL IN:` → ask first; you can't pick IEEE vs APA arbitrarily.
   - Asked to write the intro section and no spacing-dependent decision is needed → proceed; you can leave overall doc settings to a later pass.

Use judgement: don't block on `FILL IN:` markers that are irrelevant to the requested task. The goal is to avoid silently committing to a value the user hasn't approved.

## Output rules (apply to every paragraph you write)

### Language and voice

- **Vietnamese, academic register.** No spoken/conversational phrasing.
- **Never use first-person** ("tôi", "em", "mình") in the body. Use **"tác giả"** or rewrite to passive voice. First-person is acceptable only in "Lời cảm ơn" and "Lời cam đoan".
- **English technical terms** on first use: italic + Vietnamese gloss in parentheses. Example: *embedding* (vector biểu diễn), *retrieval-augmented generation* (sinh có truy hồi, viết tắt RAG). On subsequent use, plain text + the Vietnamese abbreviation if one exists.
- **Numbers**: <10 spelled out (một, hai, …), ≥10 as digits. Exception: numbers in tables, equations, references, or section IDs always stay as digits.

### Chapter and section structure (non-negotiable)

The school enforces exactly five chapters in this order. Names must be UPPERCASE with the format `CHƯƠNG N: TÊN CHƯƠNG`:

1. `CHƯƠNG 1: GIỚI THIỆU`
2. `CHƯƠNG 2: CƠ SỞ LÝ THUYẾT & CÔNG NGHỆ`
3. `CHƯƠNG 3: PHÂN TÍCH & THIẾT KẾ`
4. `CHƯƠNG 4: XÂY DỰNG & TRIỂN KHAI`
5. `CHƯƠNG 5: ĐÁNH GIÁ & KẾT LUẬN`

**Chapter 1 must contain exactly these 7 sub-sections, in this order** (the school checks for them by name):

- 1.1. Lý do chọn đề tài
- 1.2. Mục tiêu
- 1.3. Đối tượng & phạm vi
- 1.4. Phương pháp nghiên cứu
- 1.5. Bố cục đồ án
- 1.6. Tổng quan nghiên cứu
- 1.7. Xuất xứ đề tài

For Chapters 2-5, the high-level structure is fixed by the school's hướng dẫn (see chapter-structure.md). Sub-section content is flexible and tailored to this project ("Xây dựng hệ thống web search dữ liệu tích hợp LLM"), but stay within 3 numbering depths (`1`, `1.1`, `1.1.1` — never `1.1.1.1`).

### Figures and tables

- **Figures**: caption goes **below** the figure. Format: `Hình <chương>.<số>. <Mô tả>` (e.g. `Hình 2.1. Sơ đồ kiến trúc tổng quát`).
- **Tables**: caption goes **above** the table. Format: `Bảng <chương>.<số>. <Mô tả>`.
- Numbering restarts in each chapter (Hình 2.1, Hình 2.2, … Hình 3.1, …).
- Reference figures/tables in prose: "như Hình 2.1 cho thấy…", "xem Bảng 3.2".

If style-guide.md updates these conventions, that wins.

### Citations and references

If `Citation style` in style-guide.md is still `FILL IN:`, **stop and ask** before writing any cited content — picking IEEE vs APA arbitrarily and converting later is painful.

Once chosen, apply consistently: never mix styles in the same document.

## Cover page — exact specification

The cover page has fixed wording and font sizes (verified against `MẪU BÌA ĐỒ ÁN TN.docx`). Reproduce in this order:

| Line | Text | Size | Style |
| --- | --- | --- | --- |
| 1 | BỘ GIÁO DỤC VÀ ĐÀO TẠO | (header size from style-guide.md) | Bold, center |
| 2 | TRƯỜNG ĐẠI HỌC KINH DOANH VÀ CÔNG NGHỆ HÀ NỘI | (header size) | Bold, center |
| 3 | KHOA CÔNG NGHỆ THÔNG TIN | (header size) | Bold, center |
| — | Logo trường | — | center |
| 4 | ĐỒ ÁN TỐT NGHIỆP | **25pt** | Bold, center |
| 5 | (NGÀNH: CÔNG NGHỆ THÔNG TIN) | **12pt** | Bold, center |
| 6 | Đề Tài: | **16pt** | Bold |
| 7 | `<TÊN ĐỀ TÀI IN HOA>` | **16pt** | Bold |
| 8-11 | Sinh viên thực hiện / Mã sinh viên / Lớp / Giảng viên hướng dẫn | **16pt** | Bold |
| 12 | Hà Nội - 2026 | **16pt** | Bold, center |

Verbatim labels: "Sinh viên thực hiện", "Mã sinh viên", "Lớp", "Giảng viên hướng dẫn" — keep colons aligned. Use the school's full Vietnamese name with diacritics exactly as written.

## How to actually edit the .docx

The Anthropic `document-skills:docx` skill knows how to read/write Word XML safely. Use it for all I/O on `docs/report.docx`. Two rules when delegating:

1. **Override docx-skill defaults with style-guide.md values.** The docx skill has its own default font/size/spacing; whenever those conflict with style-guide.md, style-guide.md wins. Pass explicit font and size when applying styles.
2. **Never hand-edit XML or raw `.docx` bytes.** It's brittle and easy to corrupt the file.

If the requested change is small and self-contained (e.g. fix a typo, rewrite one paragraph), still go through the docx skill — don't introduce a side-channel.

## File layout

Skill-bundled (read-only, inside this skill folder):

- `references/style-guide.md` — formatting spec (always read first).
- `references/chapter-structure.md` — chapter/section layout.
- `assets/school-structure-guide.docx` — original faculty hướng dẫn (consult if markdown summaries are ambiguous).
- `assets/cover-template.docx` — original cover page template (consult before doing anything cover-related).

Project-level (outside the skill):

- **Master report** (the only file Claude edits as output): `docs/report.docx` at project root.
- `.gitignore`'d: `docs/report.docx` and `docs/report-*.docx` — drafts stay out of git history.

## Triage table — when to use this skill vs not

| Request looks like | Use this skill? |
| --- | --- |
| "Viết phần mở đầu", "Soạn chương 2 phần cơ sở lý thuyết" | **Yes** |
| "Cập nhật phần thực nghiệm với kết quả mới" | **Yes** |
| "Sinh trang bìa", "Sửa lời cảm ơn" | **Yes** |
| "Sinh mục lục", "Tạo danh mục hình" | **Yes** — use Word's TOC field, do not hand-type |
| "Viết README cho repo", "Viết hướng dẫn cài đặt cho dev" | **No** — that's regular docs/, not thesis |
| "Comment code", "Sinh JSDoc/docstring" | **No** |
| "Sinh Swagger / OpenAPI spec" | **No** |
| "Viết status update gửi GVHD trên Slack/email" | **No** — internal-comms or default |

## Common pitfalls to avoid

- **Don't invent chapter names** to fit the topic. The 5 chapter names are fixed even if some feel awkward for an AI/search project. Map the project's content into the school's structure, not the other way around.
- **Don't drop any of Chương 1's 7 sub-sections** even when one feels redundant for this project (e.g. "Xuất xứ đề tài" for a personal project). Write a short paragraph explaining the situation rather than omitting it.
- **Don't switch citation style mid-document.** If unsure, ask the user once and lock it in style-guide.md.
- **Don't use first-person in chapter bodies.** "Tôi đã xây dựng…" → "Tác giả đã xây dựng…" or "Hệ thống được xây dựng…".
- **Don't trust the docx skill's default fonts.** It might default to Calibri or Arial; force Times New Roman + the size from style-guide.md.

## Related references (all paths relative to this skill folder)

- `references/style-guide.md` — full formatting spec (read first).
- `references/chapter-structure.md` — full chapter & section layout (read second).
- `assets/school-structure-guide.docx` — original faculty document (consult if markdown summaries are ambiguous).
- `assets/cover-template.docx` — original cover template (consult before any cover work).
