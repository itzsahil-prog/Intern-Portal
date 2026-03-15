import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/public/LandingPage';

function App() {
    return (
        <>
            <Router>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    {/* Add other routes for Admin, Intern, Status Tracker etc. here */}
                </Routes>
            </Router>
            <Toaster position="top-right" reverseOrder={false} />
        </>
    );
}

export default App;