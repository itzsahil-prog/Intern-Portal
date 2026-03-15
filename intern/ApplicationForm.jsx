import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const roles = ["Frontend Developer", "Backend Developer", "Full Stack Developer", "UI/UX Designer", "Project Manager", "DevOps Intern", "QA Tester"];

const applicationSchema = z.object({
    name: z.string().min(3, "Full name is required"),
    email: z.string().email("Invalid email address"),
    whatsapp_number: z.string().min(10, "Valid WhatsApp number is required"),
    linkedin: z.string().url("Must be a valid URL"),
    portfolio: z.string().url("Must be a valid URL").optional().or(z.literal('')),
    role: z.string().min(1, "Please select a role"),
    cohort: z.string().min(1, "Please select a cohort"),
    resume: z.any()
        .refine(files => files?.length == 1, "Resume is required.")
        .refine(files => files?.[0]?.size <= 5000000, `Max file size is 5MB.`)
        .refine(
            files => ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(files?.[0]?.type),
            ".pdf, .doc, .docx files are accepted."
        ),
});

const ApplicationForm = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cohorts, setCohorts] = useState([]);

    const { register, handleSubmit, formState: { errors }, reset } = useForm({
        resolver: zodResolver(applicationSchema),
    });

    useEffect(() => {
        const fetchCohorts = async () => {
            const { data, error } = await supabase
                .from('cohorts')
                .select('id, name, max_interns')
                .eq('is_active', true);

            if (error) {
                toast.error("Could not load available cohorts.");
                console.error(error);
                return;
            }

            // In a real app, you'd also fetch intern counts per cohort to calculate slots left.
            // For now, we'll just display the name.
            setCohorts(data);
        };
        fetchCohorts();
    }, []);

    const onSubmit = async (formData) => {
        setIsSubmitting(true);
        const toastId = toast.loading('Submitting your application...');

        try {
            // 1. Check for duplicate email
            const { data: existing, error: existingError } = await supabase
                .from('applications')
                .select('email')
                .eq('email', formData.email)
                .single();

            if (existing) {
                throw new Error("An application with this email already exists.");
            }

            // 2. Upload resume
            const resumeFile = formData.resume[0];
            const fileName = `${Date.now()}_${resumeFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(fileName, resumeFile);

            if (uploadError) {
                throw new Error(`Resume upload failed: ${uploadError.message}`);
            }

            // 3. Get signed URL for the resume
            const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(fileName);
            const resume_url = urlData.publicUrl;

            // 4. Generate reference number
            const reference_number = `VCA-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            // 5. Insert application data
            const { error: insertError } = await supabase
                .from('applications')
                .insert({
                    name: formData.name,
                    email: formData.email,
                    whatsapp_number: formData.whatsapp_number,
                    linkedin: formData.linkedin,
                    portfolio: formData.portfolio,
                    role: formData.role,
                    cohort: formData.cohort,
                    resume_url: resume_url,
                    reference_number: reference_number,
                    // Add other fields from your full form here
                    availability: 'Full-time', // Placeholder
                    phone: formData.whatsapp_number, // Placeholder
                });

            if (insertError) {
                throw new Error(`Database insert failed: ${insertError.message}`);
            }

            toast.success(`Success! Your reference is ${reference_number}`, { id: toastId, duration: 6000 });
            reset();

        } catch (error) {
            toast.error(error.message, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderInput = (name, label, type = "text", options = {}) => (
        <div className="mb-4">
            <label htmlFor={name} className="block text-sm font-bold text-brand-navy mb-1">{label}</label>
            <input id={name} type={type} {...register(name)} {...options} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-orange" />
            {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
        </div>
    );

    const renderSelect = (name, label, items) => (
        <div className="mb-4">
            <label htmlFor={name} className="block text-sm font-bold text-brand-navy mb-1">{label}</label>
            <select id={name} {...register(name)} className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-orange">
                <option value="">Select...</option>
                {items.map(item => <option key={item.id || item} value={item.id || item}>{item.name || item}</option>)}
            </select>
            {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
        </div>
    );

    return (
        <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg border-t-4 border-brand-orange">
            <h2 className="text-3xl font-bold text-center text-brand-navy mb-6">Internship Application</h2>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {renderInput("name", "Full Name *")}
                {renderInput("email", "Email Address *", "email")}
                {renderInput("whatsapp_number", "WhatsApp Number *", "tel")}
                {renderInput("linkedin", "LinkedIn Profile URL *")}
                {renderInput("portfolio", "Portfolio / GitHub URL")}
                {renderSelect("role", "Role Applying For *", roles)}
                {renderSelect("cohort", "Cohort Preference *", cohorts)}
                {renderInput("resume", "Upload Resume * (PDF/DOC, max 5MB)", "file")}

                <button type="submit" disabled={isSubmitting} className="w-full bg-brand-orange hover:opacity-90 text-white font-bold py-3 px-4 rounded-md transition duration-300 disabled:bg-gray-400">
                    {isSubmitting ? 'Submitting...' : 'Apply Now'}
                </button>
            </form>
        </div>
    );
};

export default ApplicationForm;