import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Menu from './components/Menu/Menu';
import LandingPage from './components/LandingPage/LandingPage';
import ToastContainer from './components/Toast/ToastContainer';
import { useOrgContext } from './hooks/useOrgContext';

const App = () => {
	const { loading, user } = useAuth();

	useOrgContext();

	if (loading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-gray-50'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto'></div>
					<p className='mt-4 text-gray-600'>Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<Routes>
				{/* Landing page */}
				<Route path='/' element={user ? <Navigate to='/dashboard' replace /> : <LandingPage />} />

				{/* Protected dashboard */}
				<Route
					path='/dashboard/*'
					element={
						<ProtectedRoute>
							<Menu />
						</ProtectedRoute>
					}
				/>

				{/* Fallback */}
				<Route path='*' element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
			</Routes>

			{/* Toast Container */}
			<ToastContainer />
		</>
	);
};

export default App;
