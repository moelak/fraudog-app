import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { XMarkIcon, EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';

type AuthMode = 'signin' | 'signup';

interface AuthModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialMode?: AuthMode;
}

const AuthModal = ({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) => {
	const { user, loading } = useAuth();
	const navigate = useNavigate();

	const [mode, setMode] = useState<AuthMode>(initialMode);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	// Close modal and redirect if user becomes authenticated
	useEffect(() => {
		if (!loading && user) {
			onClose();
			navigate('/dashboard', { replace: true });
		}
	}, [user, loading, navigate, onClose]);

	// Reset form when modal opens/closes or mode changes
	useEffect(() => {
		if (isOpen) {
			setMode(initialMode);
		} else {
			resetForm();
		}
	}, [isOpen, initialMode]);

	const resetForm = () => {
		setEmail('');
		setPassword('');
		setFirstName('');
		setLastName('');
		setError(null);
		setMessage(null);
		setShowPassword(false);
	};

	const handleEmailAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);
		setMessage(null);

		try {
			if (mode === 'signup') {
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							first_name: firstName,
							last_name: lastName,
						},
					},
				});

				if (error) throw error;

				if (data.user && !data.session) {
					setMessage('Please check your email for a confirmation link to complete your registration.');
				} else if (data.session) {
					// User is automatically signed in after signup
					onClose();
					navigate('/dashboard', { replace: true });
				}
			} else {
				const { data, error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});

				if (error) throw error;

				if (data.session) {
					// Successful sign in
					onClose();
					navigate('/dashboard', { replace: true });
				}
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				setError(error.message);
			} else {
				setError('An error occurred during authentication');
			}
		} finally {
			setIsLoading(false);
		}
	};

	const switchMode = (newMode: AuthMode) => {
		setMode(newMode);
		setError(null);
		setMessage(null);
	};

	if (!isOpen) return null;

	return (
		<div className='fixed inset-0 z-50 overflow-y-auto'>
			<div className='flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0'>
				{/* Background overlay */}
				<div className='fixed inset-0 bg-black bg-opacity-50 transition-opacity' onClick={onClose} />

				{/* Modal panel */}
				<div className='inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full'>
					{/* Header */}
					<div className='bg-white px-6 pt-6 pb-4'>
						<div className='flex items-center justify-between mb-6'>
							<h2 className='text-2xl font-bold text-gray-900'>{mode === 'signin' ? 'Welcome back' : 'Create account'}</h2>
							<button type='button' onClick={onClose} className='text-gray-400 hover:text-gray-600 transition-colors'>
								<XMarkIcon className='h-6 w-6' />
							</button>
						</div>

						{/* Mode Toggle */}
						<div className='flex bg-gray-100 rounded-lg p-1 mb-6'>
							<button
								onClick={() => switchMode('signin')}
								className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
									mode === 'signin' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
								}`}
							>
								Sign In
							</button>
							<button
								onClick={() => switchMode('signup')}
								className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
									mode === 'signup' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
								}`}
							>
								Sign Up
							</button>
						</div>

						{/* Error/Success Messages */}
						{error && (
							<div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
								<p className='text-sm text-red-700'>{error}</p>
							</div>
						)}

						{message && (
							<div className='mb-4 p-3 bg-green-50 border border-green-200 rounded-lg'>
								<p className='text-sm text-green-700'>{message}</p>
							</div>
						)}

						{/* Email/Password Form */}
						<form onSubmit={handleEmailAuth} className='space-y-4'>
							{mode === 'signup' && (
								<div className='grid grid-cols-2 gap-4'>
									<div>
										<label htmlFor='firstName' className='block text-sm font-medium text-gray-700 mb-1'>
											First Name
										</label>
										<div className='relative'>
											<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
												<UserIcon className='h-5 w-5 text-gray-400' />
											</div>
											<input
												id='firstName'
												type='text'
												value={firstName}
												onChange={(e) => setFirstName(e.target.value)}
												className='block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
												placeholder='John'
												required={mode === 'signup'}
											/>
										</div>
									</div>
									<div>
										<label htmlFor='lastName' className='block text-sm font-medium text-gray-700 mb-1'>
											Last Name
										</label>
										<div className='relative'>
											<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
												<UserIcon className='h-5 w-5 text-gray-400' />
											</div>
											<input
												id='lastName'
												type='text'
												value={lastName}
												onChange={(e) => setLastName(e.target.value)}
												className='block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
												placeholder='Doe'
												required={mode === 'signup'}
											/>
										</div>
									</div>
								</div>
							)}

							<div>
								<label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-1'>
									Email Address
								</label>
								<div className='relative'>
									<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
										<EnvelopeIcon className='h-5 w-5 text-gray-400' />
									</div>
									<input
										id='email'
										type='email'
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className='block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
										placeholder='john@example.com'
										required
									/>
								</div>
							</div>

							<div>
								<label htmlFor='password' className='block text-sm font-medium text-gray-700 mb-1'>
									Password
								</label>
								<div className='relative'>
									<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
										<LockClosedIcon className='h-5 w-5 text-gray-400' />
									</div>
									<input
										id='password'
										type={showPassword ? 'text' : 'password'}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className='block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
										placeholder='••••••••'
										required
										minLength={6}
									/>
									<button type='button' onClick={() => setShowPassword(!showPassword)} className='absolute inset-y-0 right-0 pr-3 flex items-center'>
										{showPassword ? (
											<EyeSlashIcon className='h-5 w-5 text-gray-400 hover:text-gray-600' />
										) : (
											<EyeIcon className='h-5 w-5 text-gray-400 hover:text-gray-600' />
										)}
									</button>
								</div>
								{mode === 'signup' && <p className='mt-1 text-xs text-gray-500'>Password must be at least 6 characters long</p>}
							</div>

							<button
								type='submit'
								disabled={isLoading}
								className='w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
							>
								{isLoading ? (
									<div className='flex items-center'>
										<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
										{mode === 'signin' ? 'Signing in...' : 'Creating account...'}
									</div>
								) : mode === 'signin' ? (
									'Sign In'
								) : (
									'Create Account'
								)}
							</button>
						</form>

						{mode === 'signin' && (
							<div className='mt-4 text-center'>
								<button
									onClick={() => {
										// TODO: Implement forgot password
										alert('Forgot password functionality will be implemented');
									}}
									className='text-sm text-blue-600 hover:text-blue-500'
								>
									Forgot your password?
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthModal;
