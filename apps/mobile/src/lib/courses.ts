import { apiFetch } from "./apiClient";

export interface CourseItem {
  id: string;
  dayNo: number;
  sortOrder: number;
  contentId: string;
  titleSnapshot: string | null;
  memo: string | null;
}

export interface Course {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
  shareSlug: string | null;
  items?: CourseItem[];
}

export function listCourses(): Promise<Course[]> {
  return apiFetch<{ items: Course[] }>("/courses").then((res) => res.items);
}

export function getCourse(id: string): Promise<Course> {
  return apiFetch<Course>(`/courses/${id}`);
}

export function createCourse(input: {
  title: string;
  startDate: string;
  endDate: string;
}): Promise<Course> {
  return apiFetch<Course>("/courses", { method: "POST", body: JSON.stringify(input) });
}

export function addCourseItem(
  courseId: string,
  input: { dayNo: number; contentId: string; titleSnapshot?: string; sortOrder?: number },
): Promise<CourseItem> {
  return apiFetch<CourseItem>(`/courses/${courseId}/items`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCourseItem(
  courseId: string,
  itemId: string,
  patch: { sortOrder?: number; memo?: string },
): Promise<CourseItem> {
  return apiFetch<CourseItem>(`/courses/${courseId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function removeCourseItem(courseId: string, itemId: string): Promise<void> {
  return apiFetch<void>(`/courses/${courseId}/items/${itemId}`, { method: "DELETE" });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// UI에 코스 이름/날짜 입력이 없어서, 담기 버튼을 처음 누를 때 사용자당 코스 1개를
// 이 기본값으로 조용히 생성한다 — 화면엔 노출하지 않는다.
export function defaultCourseInput(): { title: string; startDate: string; endDate: string } {
  const today = todayIso();
  return { title: "내 코스", startDate: today, endDate: today };
}
