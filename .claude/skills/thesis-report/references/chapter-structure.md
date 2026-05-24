# Chapter Structure — HUBT khóa 27

Cấu trúc 5 chương bắt buộc theo `../assets/school-structure-guide.docx`. Các tiêu đề chương phải dùng đúng tên trường quy định (UPPERCASE).

> Mục con trong mỗi chương đã được cụ thể hoá cho đề tài "Xây dựng hệ thống web search dữ liệu tích hợp LLM" — có thể tinh chỉnh sau khi trao đổi với GVHD.

---

## CHƯƠNG 1: GIỚI THIỆU

(Cấu trúc 7 mục là **bắt buộc** theo hướng dẫn trường — không bỏ mục nào.)

- 1.1. Lý do chọn đề tài
- 1.2. Mục tiêu
- 1.3. Đối tượng & phạm vi
- 1.4. Phương pháp nghiên cứu
- 1.5. Bố cục đồ án
- 1.6. Tổng quan nghiên cứu
- 1.7. Xuất xứ đề tài

## CHƯƠNG 2: CƠ SỞ LÝ THUYẾT & CÔNG NGHỆ

(Theo hướng dẫn: Kiến thức nền + Công nghệ sử dụng + So sánh & lựa chọn công nghệ.)

- 2.1. Kiến thức nền
  - 2.1.1. Information retrieval (BM25, TF-IDF)
  - 2.1.2. Semantic search & embedding
  - 2.1.3. Hybrid search
  - 2.1.4. Mô hình ngôn ngữ lớn (LLM) & Retrieval-Augmented Generation (RAG)
- 2.2. Công nghệ sử dụng
  - 2.2.1. FastAPI (Python) — module LLM/semantic
  - 2.2.2. ASP.NET Core (.NET 10) — module CRUD
  - 2.2.3. Angular — frontend
  - 2.2.4. PostgreSQL + pgvector — vector + full-text trong cùng một CSDL
  - 2.2.5. Anthropic Claude API — LLM
- 2.3. So sánh & lựa chọn công nghệ
  - 2.3.1. Vector DB: pgvector vs Qdrant vs Weaviate
  - 2.3.2. Backend search: hybrid vs pure semantic
  - 2.3.3. LLM provider: Claude vs OpenAI vs open-source

## CHƯƠNG 3: PHÂN TÍCH & THIẾT KẾ

(Theo hướng dẫn: Phân tích yêu cầu + Use Case + UML/ERD/DFD + Thiết kế hệ thống.)

- 3.1. Phân tích yêu cầu
  - 3.1.1. Yêu cầu chức năng
  - 3.1.2. Yêu cầu phi chức năng
  - 3.1.3. Actor & người dùng
- 3.2. Use Case và đặc tả
  - 3.2.1. Sơ đồ Use Case tổng thể
  - 3.2.2. Đặc tả UC: Tìm kiếm tài liệu
  - 3.2.3. Đặc tả UC: Hỏi đáp với LLM
  - 3.2.4. Đặc tả UC: Quản lý tài liệu (CRUD)
- 3.3. UML / ERD / DFD
  - 3.3.1. Sơ đồ lớp (Class diagram)
  - 3.3.2. Sơ đồ tuần tự cho luồng search
  - 3.3.3. ERD CSDL
  - 3.3.4. DFD luồng dữ liệu
- 3.4. Thiết kế hệ thống
  - 3.4.1. Kiến trúc tổng thể (Angular → .NET API → Python core → Postgres)
  - 3.4.2. Thiết kế CSDL (bảng + vector column + index)
  - 3.4.3. Thiết kế API (REST endpoint)
  - 3.4.4. Thiết kế giao diện

## CHƯƠNG 4: XÂY DỰNG & TRIỂN KHAI

(Theo hướng dẫn: Môi trường cài đặt + Các module + Giao diện + Demo hệ thống.)

- 4.1. Môi trường cài đặt
  - 4.1.1. Phần cứng yêu cầu
  - 4.1.2. Phần mềm & công cụ
  - 4.1.3. Hướng dẫn cài đặt local (Docker / OrbStack)
- 4.2. Các module
  - 4.2.1. Module CRUD (.NET) — bao gồm migration & schema ownership
  - 4.2.2. Module LLM & semantic search (Python/FastAPI)
  - 4.2.3. Module frontend (Angular)
  - 4.2.4. Tích hợp giữa các module
- 4.3. Giao diện
  - 4.3.1. Giao diện trang chủ / ô tìm kiếm
  - 4.3.2. Giao diện kết quả tìm kiếm
  - 4.3.3. Giao diện hỏi đáp LLM
  - 4.3.4. Giao diện quản trị
- 4.4. Demo hệ thống
  - 4.4.1. Kịch bản demo
  - 4.4.2. Hình ảnh / video demo

## CHƯƠNG 5: ĐÁNH GIÁ & KẾT LUẬN

(Theo hướng dẫn: Kết quả đạt được + Đánh giá + Hạn chế + Hướng phát triển.)

- 5.1. Kết quả đạt được
- 5.2. Đánh giá
  - 5.2.1. Bộ dữ liệu thử nghiệm
  - 5.2.2. Độ chính xác (precision, recall, MRR)
  - 5.2.3. Thời gian phản hồi
  - 5.2.4. So sánh full-text vs semantic vs hybrid
- 5.3. Hạn chế
- 5.4. Hướng phát triển
  - 5.4.1. Định hướng mở rộng
  - 5.4.2. Khả năng ứng dụng thực tế

## Phụ lục

- A. Hướng dẫn cài đặt & chạy hệ thống chi tiết
- B. Danh sách API endpoint
- C. Mã nguồn quan trọng (tùy chọn)
