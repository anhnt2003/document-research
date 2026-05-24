import { Tag } from '../../models';

export const TAGS: Tag[] = [
  { id: 'tag-cs', label: 'Khoa học máy tính', color: 'oxblood', documentCount: 14 },
  { id: 'tag-ml', label: 'Học máy', color: 'amber', parentId: 'tag-cs', documentCount: 9 },
  { id: 'tag-nlp', label: 'Xử lý ngôn ngữ', color: 'amber', parentId: 'tag-cs', documentCount: 6 },
  { id: 'tag-db', label: 'Cơ sở dữ liệu', color: 'moss', parentId: 'tag-cs', documentCount: 5 },
  { id: 'tag-arch', label: 'Kiến trúc phần mềm', color: 'ink', parentId: 'tag-cs', documentCount: 4 },
  { id: 'tag-econ', label: 'Kinh tế', color: 'rust', documentCount: 7 },
  { id: 'tag-fin', label: 'Tài chính', color: 'rust', parentId: 'tag-econ', documentCount: 3 },
  { id: 'tag-thesis', label: 'Luận văn', color: 'oxblood', documentCount: 11 },
  { id: 'tag-paper', label: 'Bài báo', color: 'moss', documentCount: 8 },
  { id: 'tag-textbook', label: 'Giáo trình', color: 'ink', documentCount: 6 },
];
