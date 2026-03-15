import { supabase } from './supabase'

/**
 * Send WhatsApp message via Supabase Edge Function (server-side, token never exposed)
 */
export async function sendWhatsApp({ phone, type, variables, internId }) {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { phone, type, variables, internId },
    })
    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('WhatsApp send failed:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Build acceptance message variables
 */
export function buildAcceptanceVars({ name, role, loginId, password, cohortStartDate, mentorName }) {
  return [name, role, loginId, password, cohortStartDate, mentorName || 'Your Mentor']
}

/**
 * Build rejection message variables
 */
export function buildRejectionVars({ name, role }) {
  return [name, role]
}

/**
 * Build interview schedule variables
 */
export function buildInterviewVars({ name, date, time, link }) {
  return [name, date, time, link || 'TBD']
}

/**
 * Build task reminder variables
 */
export function buildTaskReminderVars({ name, taskTitle, dueDate }) {
  return [name, taskTitle, dueDate]
}

/**
 * Build submission approved variables
 */
export function buildSubmissionApprovedVars({ name, taskTitle, points }) {
  return [name, taskTitle, String(points)]
}
