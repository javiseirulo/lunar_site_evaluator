import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes (same helper shadcn/ui components expect). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
