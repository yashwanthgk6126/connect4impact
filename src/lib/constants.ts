import type { PostType } from './types'

export const EVENT_CATEGORIES: Record<string, string> = {
  environment: 'Environment',
  food: 'Food & Hunger',
  health: 'Health',
  education: 'Education',
  animal_welfare: 'Animal Welfare',
  cleanup: 'Cleanup Drive',
  elderly_care: 'Elderly Care',
  fundraising: 'Fundraising',
  other: 'Other',
}

export const POST_TYPES: Record<PostType, { label: string; color: string }> = {
  update: { label: 'Update', color: 'bg-slate-100 text-slate-700' },
  announcement: { label: 'Announcement', color: 'bg-amber-100 text-amber-800' },
  photo: { label: 'Photo', color: 'bg-pink-100 text-pink-700' },
  volunteer: { label: 'Volunteer Opportunity', color: 'bg-sky-100 text-sky-700' },
  event: { label: 'Event', color: 'bg-brand-100 text-brand-700' },
  help_request: { label: 'Help Request', color: 'bg-red-100 text-red-700' },
}

export const ISSUE_CATEGORIES: Record<string, string> = {
  roads: 'Roads & Potholes',
  garbage: 'Garbage',
  water: 'Water Supply',
  electricity: 'Electricity / Streetlights',
  safety: 'Public Safety',
  pollution: 'Pollution',
  other: 'Other',
}

export const REPORT_REASONS = ['Spam', 'Harassment or hate', 'Misleading or fraudulent', 'Inappropriate content', 'Other']
