import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addCourseItem,
  createCourse,
  defaultCourseInput,
  getCourse,
  listCourses,
  removeCourseItem,
  updateCourseItem,
} from "../lib/courses";
import type { Course, CourseItem } from "../lib/courses";

const COURSES_KEY = ["courses"];

export function useMyCourse() {
  const { data: courses, isPending: listPending } = useQuery({
    queryKey: COURSES_KEY,
    queryFn: listCourses,
  });
  const courseId = courses?.[0]?.id;
  const { data: course, isPending: detailPending } = useQuery({
    queryKey: [...COURSES_KEY, courseId],
    queryFn: () => getCourse(courseId!),
    enabled: !!courseId,
  });

  return {
    course,
    isPending: listPending || (!!courseId && detailPending),
  };
}

export function useToggleCourseItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      course,
      contentId,
      title,
    }: {
      course: Course | undefined;
      contentId: string;
      title: string;
    }) => {
      let courseId = course?.id;
      if (!courseId) {
        const created = await createCourse(defaultCourseInput());
        courseId = created.id;
      }
      const existingItem = course?.items?.find((item) => item.contentId === contentId);
      if (existingItem) {
        await removeCourseItem(courseId, existingItem.id);
        return { saved: false };
      }
      await addCourseItem(courseId, { dayNo: 1, contentId, titleSnapshot: title });
      return { saved: true };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSES_KEY }),
  });
}

export function useReorderCourseItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      courseId,
      items,
      contentId,
      direction,
    }: {
      courseId: string;
      items: CourseItem[];
      contentId: string;
      direction: "up" | "down";
    }) => {
      const index = items.findIndex((item) => item.contentId === contentId);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= items.length) return;
      const a = items[index];
      const b = items[swapWith];
      await Promise.all([
        updateCourseItem(courseId, a.id, { sortOrder: b.sortOrder }),
        updateCourseItem(courseId, b.id, { sortOrder: a.sortOrder }),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSES_KEY }),
  });
}
