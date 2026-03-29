import type { RecruitmentDepartment } from "../types/recruitment";

export const DEPARTMENT_SORT_ORDER: Record<RecruitmentDepartment, number> = {
    tech: 10,
    video: 20,
    live: 30,
    clip: 40,
    art: 50,
    copywriting: 60,
    vup: 70,
};

export function departmentOrderFromSlug(department: RecruitmentDepartment): number {
    return DEPARTMENT_SORT_ORDER[department];
}