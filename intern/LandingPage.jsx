import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ApplicationForm from '../../components/public/ApplicationForm';

const LandingPage = () => {
    const [applicationCount, setApplicationCount] = useState(0);

    useEffect(() => {
        const fetchCount = async () => {
            const { count, error } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error('Error fetching application count:', error);
            } else {
                setApplicationCount(count);
            }
        };

        fetchCount();

        // Listen to real-time inserts on the applications table
        const channel = supabase.channel('public:applications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'applications' }, (payload) => {
                setApplicationCount(prevCount => prevCount + 1);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    return (
        <div className="min-h-screen bg-brand-light-blue flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="text-center mb-8">
                <h1 className="text-5xl md:text-7xl font-extrabold text-brand-navy">VeloxCode<span className="text-brand-orange">Agency</span></h1>
                <p className="text-xl md:text-2xl mt-2 text-brand-navy font-semibold">Build Fast. Learn Faster.</p>
                <p className="mt-4 text-lg text-gray-600 font-medium">
                    <span className="text-brand-orange font-bold text-xl">{applicationCount}</span> applications received for the current cohort!
                </p>
            </div>
            <ApplicationForm />
        </div>
    );
};

export default LandingPage;