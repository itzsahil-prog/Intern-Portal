import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { generateReferenceNumber } from '../../lib/utils'
import Stepper from '../../components/ui/Stepper'
import Button from '../../components/ui/Button'

const STEPS = ['Personal Info', 'Role & Availability', 'Skills & Letter', 'Upload & Submit']
const ROLES = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI/UX Designer', 'Project Manager', 'DevOps Intern', 'QA Tester']
const SKILLS = ['React', 'Node.js', 'Python', 'Figma', 'MongoDB', 'MySQL', 'Flutter', 'DevOps', 'Testing', 'Other']
const HEAR_ABOUT = ['LinkedIn', 'Instagram', 'Friend/Referral', 'Google', 'Other']

const schema = z.object({
  name: z.string().min(3, 'Full name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(7, 'Phone required'),
  whatsapp_number: z.string().min(7, 'WhatsApp number required'),
  linkedin: z.string().url('Must be a valid URL'),
  portfolio: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  role: z.string().min(1, 'Select a role'),
  cohort: z.string().min(1, 'Select a cohort'),
  availability: z.string().min(1, 'Select availability'),
  start_date: z.string().min(1, 'Select start date'),
  experience: z.string().optional(),
  skills: z.array(z.string()).min(1, 'Select at least one skill'),
  cover_letter: z.string().min(50, 'Min 50 characters').max(500, 'Max 500 characters'),
  hear_about: z.string().optional(),
  terms: z.boolean().refine(v => v === true, 'You must agree to terms'),
})

const DRAFT_KEY = 'vca_application_draft'

export default function ApplicationForm() {
  const [step, setStep] = useState(0)
  const [cohorts, setCohorts] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [sameAsPhone, setSameAsPhone] = useState(false)

  const { register, handleSubmit, control, watch, setValue, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: (() => {
      try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') } catch { return {} }
    })(),
  })

  const watchedValues = watch()
  const coverLetter = watch('cover_letter') || ''
  const phone = watch('phone')

  // Auto-save draft
  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(watchedValues))
    }, 30000)
    return () => clearInterval(timer)
  }, [watchedValues])

  // Same as phone
  useEffect(() => {
    if (sameAsPhone && phone) setValue('whatsapp_number', phone)
  }, [sameAsPhone, phone, setValue])

  useEffect(() => {
    supabase.from('cohorts').select('id, name, max_interns').eq('is_active', true)
      .then(({ data }) => setCohorts(data || []))
  }, [])

  const stepFields = [
    ['name', 'email', 'phone', 'whatsapp_number', 'linkedin', 'portfolio'],
    ['role', 'cohort', 'availability', 'start_date', 'experience'],
    ['skills', 'cover_letter', 'hear_about'],
    ['terms'],
  ]

  async function nextStep() {
    const valid = await trigger(stepFields[step])
    if (valid) setStep(s => s + 1)
  }

  async function onSubmit(data) {
    setSubmitting(true)
    const tid = toast.loading('Submitting your application...')
    try {
      // Duplicate check
      const { data: existing } = await supabase.from('applications').select('email').eq('email', data.email).maybeSingle()
      if (existing) throw new Error('An application with this email already exists.')

      // Upload resume if provided
      let resume_url = null
      if (data.resume?.[0]) {
        const file = data.resume[0]
        if (file.size > 5 * 1024 * 1024) throw new Error('Resume must be under 5MB')
        const fname = `${Date.now()}_${file.name}`
        const { error: upErr } = await supabase.storage.from('resumes').upload(fname, file)
        if (upErr) throw new Error('Resume upload failed: ' + upErr.message)
        const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(fname)
        resume_url = urlData.publicUrl
      }

      const reference_number = generateReferenceNumber()

      const { error } = await supabase.from('applications').insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        whatsapp_number: data.whatsapp_number,
        linkedin: data.linkedin,
        portfolio: data.portfolio || null,
        role: data.role,
        cohort: data.cohort,
        availability: data.availability,
        start_date: data.start_date,
        cover_letter: data.cover_letter,
        resume_url,
        reference_number,
        status: 'Submitted',
      })
      if (error) throw new Error(error.message)

      localStorage.removeItem(DRAFT_KEY)
      toast.success('Application submitted!', { id: tid })
      setSubmitted({ reference_number, name: data.name })
    } catch (err) {
      toast.error(err.message, { id: tid })
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-10 text-center shadow-2xl"
      >
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-[#1B2A5C] font-heading mb-2">Application Submitted!</h2>
        <p className="text-gray-600 mb-4">Hi {submitted.name}, we've received your application.</p>
        <div className="bg-[#E8EDF5] rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">Your Reference Number</p>
          <p className="text-2xl font-bold text-[#F26522] font-heading">{submitted.reference_number}</p>
          <p className="text-xs text-gray-400 mt-1">Save this to track your application status</p>
        </div>
        <a href="/status" className="text-[#F26522] font-semibold hover:underline text-sm">Track Application Status →</a>
      </motion.div>
    )
  }

  const inputCls = (err) => `w-full px-4 py-2.5 rounded-xl border ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'} focus:outline-none focus:ring-2 focus:ring-[#F26522] text-gray-800 text-sm transition-all`
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1'
  const errCls = 'text-red-500 text-xs mt-1'

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-[#1B2A5C] p-6">
        <Stepper steps={STEPS} current={step} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-8">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h3 className="text-xl font-bold text-[#1B2A5C] font-heading mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input {...register('name')} className={inputCls(errors.name)} placeholder="John Doe" />
                  {errors.name && <p className={errCls}>{errors.name.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Email Address *</label>
                  <input {...register('email')} type="email" className={inputCls(errors.email)} placeholder="john@example.com" />
                  {errors.email && <p className={errCls}>{errors.email.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Phone Number *</label>
                  <input {...register('phone')} type="tel" className={inputCls(errors.phone)} placeholder="+1 234 567 8900" />
                  {errors.phone && <p className={errCls}>{errors.phone.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>WhatsApp Number *</label>
                  <div className="flex items-center gap-2 mb-1">
                    <input type="checkbox" id="samePhone" checked={sameAsPhone} onChange={e => setSameAsPhone(e.target.checked)} className="accent-[#F26522]" />
                    <label htmlFor="samePhone" className="text-xs text-gray-500">Same as phone</label>
                  </div>
                  <input {...register('whatsapp_number')} type="tel" className={inputCls(errors.whatsapp_number)} placeholder="+1 234 567 8900" disabled={sameAsPhone} />
                  {errors.whatsapp_number && <p className={errCls}>{errors.whatsapp_number.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>LinkedIn Profile URL *</label>
                  <input {...register('linkedin')} className={inputCls(errors.linkedin)} placeholder="https://linkedin.com/in/..." />
                  {errors.linkedin && <p className={errCls}>{errors.linkedin.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Portfolio / GitHub URL</label>
                  <input {...register('portfolio')} className={inputCls(errors.portfolio)} placeholder="https://github.com/..." />
                  {errors.portfolio && <p className={errCls}>{errors.portfolio.message}</p>}
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h3 className="text-xl font-bold text-[#1B2A5C] font-heading mb-4">Role & Availability</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Role Applying For *</label>
                  <select {...register('role')} className={inputCls(errors.role)}>
                    <option value="">Select role...</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {errors.role && <p className={errCls}>{errors.role.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Cohort Preference *</label>
                  <select {...register('cohort')} className={inputCls(errors.cohort)}>
                    <option value="">Select cohort...</option>
                    {cohorts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.max_interns} slots)</option>)}
                  </select>
                  {errors.cohort && <p className={errCls}>{errors.cohort.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Availability *</label>
                  <select {...register('availability')} className={inputCls(errors.availability)}>
                    <option value="">Select...</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                  </select>
                  {errors.availability && <p className={errCls}>{errors.availability.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Preferred Start Date *</label>
                  <input {...register('start_date')} type="date" className={inputCls(errors.start_date)} />
                  {errors.start_date && <p className={errCls}>{errors.start_date.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Years of Experience</label>
                  <select {...register('experience')} className={inputCls(false)}>
                    <option value="">Select...</option>
                    {['0', '1', '2', '3+'].map(e => <option key={e} value={e}>{e} year{e !== '1' ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h3 className="text-xl font-bold text-[#1B2A5C] font-heading mb-4">Skills & Cover Letter</h3>
              <div>
                <label className={labelCls}>Primary Skills * (select all that apply)</label>
                <Controller
                  name="skills"
                  control={control}
                  defaultValue={[]}
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {SKILLS.map(skill => {
                        const selected = (field.value || []).includes(skill)
                        return (
                          <button
                            key={skill} type="button"
                            onClick={() => {
                              const curr = field.value || []
                              field.onChange(selected ? curr.filter(s => s !== skill) : [...curr, skill])
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selected ? 'bg-[#F26522] text-white border-[#F26522]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#F26522]'}`}
                          >
                            {skill}
                          </button>
                        )
                      })}
                    </div>
                  )}
                />
                {errors.skills && <p className={errCls}>{errors.skills.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Cover Letter / Why VeloxCode? * <span className="text-gray-400 font-normal">({coverLetter.length}/500)</span></label>
                <textarea
                  {...register('cover_letter')}
                  rows={5}
                  maxLength={500}
                  className={inputCls(errors.cover_letter)}
                  placeholder="Tell us why you want to join VeloxCodeAgency and what you bring to the team..."
                />
                {errors.cover_letter && <p className={errCls}>{errors.cover_letter.message}</p>}
              </div>
              <div>
                <label className={labelCls}>How did you hear about us?</label>
                <select {...register('hear_about')} className={inputCls(false)}>
                  <option value="">Select...</option>
                  {HEAR_ABOUT.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h3 className="text-xl font-bold text-[#1B2A5C] font-heading mb-4">Upload & Submit</h3>
              <div>
                <label className={labelCls}>Upload Resume * (PDF/DOC, max 5MB)</label>
                <input
                  {...register('resume')}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#F26522] file:text-white file:font-semibold hover:file:bg-orange-600 cursor-pointer"
                />
                {errors.resume && <p className={errCls}>{errors.resume.message}</p>}
              </div>
              <div className="bg-[#E8EDF5] rounded-xl p-4">
                <h4 className="font-semibold text-[#1B2A5C] mb-2 text-sm">Review Your Application</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <span>Name: <strong>{watchedValues.name}</strong></span>
                  <span>Role: <strong>{watchedValues.role}</strong></span>
                  <span>Email: <strong>{watchedValues.email}</strong></span>
                  <span>Availability: <strong>{watchedValues.availability}</strong></span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <input {...register('terms')} type="checkbox" id="terms" className="mt-1 accent-[#F26522]" />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the <span className="text-[#F26522] font-semibold">Terms & Conditions</span> and confirm all information provided is accurate.
                </label>
              </div>
              {errors.terms && <p className={errCls}>{errors.terms.message}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          {step > 0
            ? <Button type="button" variant="ghost" onClick={() => setStep(s => s - 1)}>← Back</Button>
            : <div />
          }
          {step < STEPS.length - 1
            ? <Button type="button" onClick={nextStep}>Next →</Button>
            : <Button type="submit" loading={submitting}>Submit Application 🚀</Button>
          }
        </div>
      </form>
    </div>
  )
}
