export const categorySelect = {
  id: true,
  name: true,
  color: true,
  sortOrder: true
} as const;

export type CategoryViewDto = {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
};
