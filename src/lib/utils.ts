import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isPreviewEnvironment(): boolean {
  const hostname = window.location.hostname;
  return hostname.includes('id-preview--') || hostname.includes('.lovableproject.com');
}
