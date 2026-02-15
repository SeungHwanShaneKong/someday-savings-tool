import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isPreviewMode = () => {
  return window.location.hostname.includes('preview') 
    && window.location.hostname.includes('lovable.app');
};
