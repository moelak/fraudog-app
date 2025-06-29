import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AuthModal from '../Auth/AuthModal';
import BoltBadge from '../BoltBadge/BoltBadge';
import { observer } from 'mobx-react-lite';

const LandingPage = observer(() => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
	const [activeSection, setActiveSection] = useState('home');

	// Redirect to dashboard if already authenticated
	if (user) {
		navigate('/dashboard');
		return null;
	}

	const handleSignIn = () => {
		setAuthMode('signin');
		setIsAuthModalOpen(true);
	};

	const handleSignUp = () => {
		setAuthMode('signup');
		setIsAuthModalOpen(true);
	};

	const closeAuthModal = () => {
		setIsAuthModalOpen(false);
	};

	const scrollToSection = (sectionId: string) => {
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
	};

	useEffect(() => {
		const handleScroll = () => {
			const sections = ['home', 'features', 'results', 'why-us', 'platform'];
			const scrollPosition = window.scrollY + 100;

			for (const section of sections) {
				const element = document.getElementById(section);
				if (element) {
					const { offsetTop, offsetHeight } = element;
					if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
						setActiveSection(section);
						break;
					}
				}
			}
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	useEffect(() => {
		const steps = document.querySelectorAll('.footstep');
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('animate');
					}
				});
			},
			{ threshold: 0.1 }
		);

		steps.forEach((step) => observer.observe(step));
		return () => steps.forEach((step) => observer.unobserve(step));
	}, []);

	return (
		<>
			<div className='min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white overflow-x-hidden'>
				{/* Animated Background */}
				<div className='fixed inset-0 z-0'>
					<div className='absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-black'></div>
					<div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]'></div>
					{/* Animated particles */}
					<div className='absolute inset-0'>
						{[...Array(50)].map((_, i) => (
							<div
								key={i}
								className='absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse'
								style={{
									left: `${Math.random() * 100}%`,
									top: `${Math.random() * 100}%`,
									animationDelay: `${Math.random() * 3}s`,
									animationDuration: `${2 + Math.random() * 3}s`,
								}}
							/>
						))}
					</div>
				</div>

				{/* Sticky Navigation */}
				<nav className='fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-purple-500/20'>
					<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
						<div className='flex items-center justify-between h-16'>
							{/* Logo */}
							<div className='flex items-center'>
								<div className='text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent'>Fraud-dog</div>
							</div>

							{/* Navigation Links */}
							<div className='hidden md:flex items-center space-x-8'>
								{[
									{ id: 'home', label: 'Home' },
									{ id: 'features', label: 'Features' },
									{ id: 'results', label: 'Results' },
									{ id: 'why-us', label: 'Why Us' },
									{ id: 'platform', label: 'Platform' },
								].map((item) => (
									<button
										key={item.id}
										onClick={() => scrollToSection(item.id)}
										className={`px-3 py-2 text-sm font-medium transition-all duration-300 hover:text-purple-400 ${
											activeSection === item.id ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-300'
										}`}
									>
										{item.label}
									</button>
								))}
							</div>

							{/* Auth Buttons */}
							<div className='flex items-center space-x-4'>
								<button onClick={handleSignIn} className='px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors'>
									Login
								</button>

								<button
									onClick={handleSignUp}
									className='px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25'
								>
									Sign Up
								</button>
							</div>
						</div>
					</div>
				</nav>

				{/* Section 1: Hero Header */}
				<section id='home' className='relative min-h-screen flex justify-center pt-16'>
					<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
						{/* Left Content */}
						<div className='text-left lg:text-left z-10'>
							<h1 className='text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-600 bg-clip-text text-transparent leading-tight'>
								24/7 Gen-AI co-pilot that stops fraud, not customers
							</h1>
							<p className='text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed'>
								Fraudsters iterate in minutes; ChargeGuard AI responds in seconds. Our lightning-fast, explainable platform turns new attacks into instant
								countermeasures, slashing chargebacks while shielding growth of valuable customers.
							</p>

							{/* Badge Buttons */}
							<div className='flex flex-wrap gap-3 mb-8'>
								<div className='flex items-center px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium shadow-md'>
									<svg className='w-4 h-4 mr-2 text-green-300' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
										<path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
									</svg>
									Reduce Fraud Losses
								</div>
								<div className='flex items-center px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium shadow-md'>
									<svg className='w-4 h-4 mr-2 text-cyan-300' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
										<path strokeLinecap='round' strokeLinejoin='round' d='M3 12h18M3 6h18M3 18h18' />
									</svg>
									Stabilize Revenue
								</div>
								<div className='flex items-center px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium shadow-md'>
									<svg className='w-4 h-4 mr-2 text-yellow-300' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
										<path strokeLinecap='round' strokeLinejoin='round' d='M13 10V3L4 14h7v7l9-11h-7z' />
									</svg>
									Zero Added Friction
								</div>
							</div>
						</div>

						{/* Right Visual - Robot Image (2x Larger, No White Dots) */}
						<div className='hidden lg:flex relative justify-end'>
							<div className='relative'>
								{/* Robot Image with Effects - Made 2x Larger */}
								<div className='relative w-[768px] h-[768px] mx-auto flex items-center justify-center'>
									<div className='relative'>
										{/* Glowing background effect */}
										<div className='absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-3xl scale-150'></div>

										{/* Robot Image - 2x Larger (was 320px, now 640px) */}
										<img
											src='/images/roboAI.png'
											alt='AI Fraud Detection Robot'
											className='relative z-10 w-[580px] h-[580px] object-contain drop-shadow-2xl'
											style={{
												filter: 'drop-shadow(0 0 30px rgba(147, 51, 234, 0.3))',
											}}
										/>

										<img
											src='/images/left-footstep.svg'
											alt='Footsteps'
											className='absolute  footstep z-0 w-24 step-2 opacity-0 top-[75%] right-[50%] transform -translate-x-1/2 translate-y-12 rotate-[5deg]' 
										/>

										<img
											src='/images/right-footstep.svg'
											alt='Footsteps'
											className='absolute footstep z-0 w-24 step-3 opacity-0 top-[90%] right-[68%] transform -translate-x-1/2 translate-y-12'
										/>

										<img
											src='/images/left-footstep.svg'
											alt='Footsteps'
											className='absolute  footstep z-0 w-24 step-4 opacity-0 top-[108%] right-[80%] transform -translate-x-1/2 translate-y-12 rotate-[-5deg]'
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Section 2: Features */}
				<section id='features' className='py-20 relative'>
					<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
						<div className='text-center mb-16'>
							<h2 className='text-4xl lg:px-52 md:text-5xl font-bold text-gray-900 dark:text-white'>
								<span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500'>AI-Powered Features</span> to Supercharge Fraud Teams
							</h2>
							<p className='mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto'>
								Our comprehensive platform combines advanced AI with industry expertise to help you win more disputes and maintain healthy finances.
							</p>
						</div>

						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{[
								{
									title: 'Rule Generation Service',
									description:
										'Ship fraud rules in minutes. Generate, simulate, and deploy with one API call, turning hours into minutes when deploying new defenses.',
									icon: '🛠️',
								},
								{
									title: 'Memory Service + Gateway',
									description:
										'See every signal, stop every scam. Unified 360° context in a single API response, eliminating data silos and speeding up investigations.',
									icon: '🧠',
								},
								{
									title: 'Real-Time Risk Score API',
									description:
										'Predict fraud before it settles. Blocks bad actors before transactions settle with industry-leading response times (≤150 ms p95).',
									icon: '⏱️',
								},
								{
									title: 'Chargeback Management Service',
									description: 'Turn disputes into dollars. Auto-compile, file, and track disputes for a >50% win-rate uplift, saving analyst hours.',
									icon: '🛡️',
								},
								{
									title: 'Friction Analysis',
									description: 'Protect customers, not conversions. Quantifies false-positive cost and recommends the least-intrusive step-up authentication.',
									icon: '📊',
								},
								{
									title: 'Performance Metrics',
									description: 'Achieve industry-leading benchmarks with our false positive rate of 3%, and 90% rule deployment automation.',
									icon: '📈',
								},
							].map((feature, index) => (
								<div
									key={index}
									className='bg-white dark:bg-white/5 rounded-xl p-6 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 border border-gray-200 dark:border-purple-500/20'
								>
									<div className='text-4xl mb-4'>{feature.icon}</div>
									<h3 className='text-lg font-semibold text-gray-900 dark:text-purple-200 mb-2'>{feature.title}</h3>
									<p className='text-gray-600 dark:text-gray-300 text-sm'>{feature.description}</p>
								</div>
							))}
						</div>
						<img
							src='/images/foot-steps.svg'
							alt='Footsteps'
							className=' hidden lg:flex absolute footstep  step-5 z-0 top-[95%] right-[45%] transform -translate-x-1/2 translate-y-12 w-24 opacity-80 
                     '
						/>
					</div>
				</section>

				<section id='results' className=' py-20 relative'>
					<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
						<h2 className='text-3xl md:text-4xl font-bold mb-4'>
							Real Results for <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500'>Fintech Leaders</span>
						</h2>
						<p className='text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-12'>
							Our customers experience significant improvements in key performance indicators across their chargeback management workflow.
						</p>

						<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
							{[
								{
									value: '78%',
									label: 'Average Recovery Rate',
									change: '+18%',
								},
								{
									value: '3.2x',
									label: 'ROI on Platform Investment',
									change: '+24%',
								},
								{
									value: '92%',
									label: 'Faster Resolution Times',
									change: '+35%',
								},
								{
									value: '47%',
									label: 'Reduction in False Declines',
									change: '+12%',
								},
							].map((item, index) => (
								<div key={index} className='bg-white dark:bg-white/5 shadow-sm rounded-xl px-6 py-8 border border-gray-200 dark:border-white/10'>
									<h3 className='text-3xl font-bold mb-2'>{item.value}</h3>
									<p className='text-gray-700 dark:text-gray-300 mb-3 text-sm'>{item.label}</p>
									<div className='flex items-center justify-center text-green-500 font-medium text-sm'>
										<svg className='w-4 h-4 mr-1' fill='currentColor' viewBox='0 0 20 20'>
											<path
												fillRule='evenodd'
												d='M5 10a1 1 0 011.707-.707L10 12.586l3.293-3.293A1 1 0 0115 10v6a1 1 0 11-2 0v-4.586l-2.293 2.293a1 1 0 01-1.414 0L7 11.414V16a1 1 0 11-2 0v-6z'
												clipRule='evenodd'
											/>
										</svg>
										{item.change}
									</div>
								</div>
							))}
						</div>
						<img
							src='/images/foot-steps.svg'
							alt='Footsteps'
							className='hidden lg:flex absolute footstep  step-5 z-0 top-[90%] right-[45%] transform -translate-x-1/2 translate-y-12 w-24 opacity-80 rotate-[-40deg]'
						/>
					</div>
				</section>

				<section id='why-us' className=' py-20 relative'>
					<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
						{/* Left Content */}
						<div>
							<h2 className='text-2xl md:text-3xl font-bold mb-6'>Why Customers Choose Us</h2>
							{[
								{
									title: 'Increase win back rates and lower fraud losses',
									desc: 'Our AI algorithms identify patterns and build evidence packages that increase your win rates against fraud and non-fraud chargebacks.',
								},
								{
									title: 'Improve stability of fraud budgets',
									desc: 'Accurately forecast chargeback trends and maintain stable financial planning with predictive analytics.',
								},
								{
									title: 'Reduce false positive frictions on good users',
									desc: 'Intelligent user behavior analysis prevents legitimate customers from experiencing unnecessary restrictions.',
								},
							].map((item, index) => (
								<div key={index} className='flex items-start mb-6'>
									<div className='w-8 h-8 flex items-center justify-center rounded-full  text-white font-bold mr-4'>{index + 1}</div>
									<div>
										<h3 className='font-semibold text-base mb-1'>{item.title}</h3>
										<p className='text-sm text-gray-600 dark:text-gray-300'>{item.desc}</p>
									</div>
								</div>
							))}
						</div>

						{/* Right Stats */}
						<div className='bg-blue-50 dark:bg-white/5 rounded-xl p-8 shadow-sm'>
							<p className='text-sm text-gray-500 dark:text-gray-300 uppercase font-medium mb-2'>Average Client Results</p>
							<h3 className='text-3xl font-bold text-blue-600 mb-1'>$2.4M</h3>
							<p className='text-sm text-gray-700 dark:text-gray-300 mb-6'>Additional revenue recovered annually</p>

							{/* Bars */}
							<div className='space-y-4'>
								{/* Recovery Rate */}
								<div>
									<div className='flex justify-between text-sm font-medium mb-1'>
										<span>Recovery Rate</span>
										<span>78%</span>
									</div>
									<div className='w-full h-2 bg-gray-200 rounded-full overflow-hidden'>
										<div className='h-full bg-blue-600 rounded-full w-[78%]'></div>
									</div>
								</div>

								{/* False Positive Reduction */}
								<div>
									<div className='flex justify-between text-sm font-medium mb-1'>
										<span>False Positive Reduction</span>
										<span>47%</span>
									</div>
									<div className='w-full h-2 bg-gray-200 rounded-full overflow-hidden'>
										<div className='h-full bg-blue-600 rounded-full w-[47%]'></div>
									</div>
								</div>

								{/* Implementation Time */} 
								<div>
									<div className='flex justify-between text-sm font-medium mb-1'>
										<span>Implementation Time</span>
										<span>2 weeks</span>
									</div>
									<div className='w-full h-2 bg-gray-200 rounded-full overflow-hidden'>
										<div className='h-full bg-green-400 rounded-full w-[20%]'></div>
									</div>
								</div>
							</div>
						</div>
						<img
							src='/images/foot-steps.svg'
							alt='Footsteps'
							className='hidden lg:flex absolute footstep  step-5 z-0 top-[90%] right-[45%] transform -translate-x-1/2 translate-y-12 w-24 opacity-80 rotate-[-50deg]'
						/>
					</div>
				</section>

				{/* Section 3: About / Use Case */}
				<section id='platform' className=' py-20 min-h-[80vh] relative'>
					<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
						{/* Left Visual - Robot in Data Environment */}
						<div className='hidden lg:flex  relative  justify-center lg:justify-start'>
							<div className='relative w-80 h-80'>
								{/* Data Warehouse Background */}
								<div className='absolute inset-0  rounded-2xl  backdrop-blur-sm'>
									{/* Data Streams */}
									{[...Array(6)].map((_, i) => (
										<div
											key={i}
											className='absolute w-full h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent'
											style={{
												top: `${20 + i * 40}px`,
												animation: `slideRight 3s infinite ${i * 0.5}s`,
											}}
										/>
									))}
								</div>

								{/* Robot Image in Container */}
								<div className='absolute inset-0 flex items-center justify-center'>
									<div className='relative'>
										{/* Subtle glow effect */}
										<div className='absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full blur-2xl'></div>

										{/* Smaller robot image for this section */}
										<img
											src='/images/robo-thumbs-up.png'
											alt='AI Assistant Robot'
											className='relative z-10 w-58 h-58 object-contain opacity-80'
											style={{
												filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.2))',
											}}
										/>
									</div>
								</div>
							</div>
						</div>

						{/* Right Content */}
						<div className='text-white'>
							<h2 className='text-4xl md:text-5xl font-bold mb-6 leading-tight'>
								<span className='text-purple-300'>Built for Analysts</span>, <span className='text-blue-400'>Loved by Engineers</span>
							</h2>
							<p className='text-lg text-gray-300 mb-6'>
								Let our AI handle the complexity while you focus on decisions that matter. Our intuitive interface makes fraud detection accessible to everyone.
							</p>
							<ul className='space-y-4 text-base text-gray-200'>
								{[
									'Automated threat detection and response',
									'Customizable rules and thresholds',
									'Comprehensive reporting and analytics',
									'Seamless integration with existing systems',
								].map((item, index) => (
									<li key={index} className='flex items-start'>
										<span className='w-2 h-2 mt-2 mr-3 bg-purple-400 rounded-full shrink-0' />
										{item}
									</li>
								))}
							</ul>
						</div>
					</div>
				</section>

				{/* Footer */}
				<footer className='py-12 border-t border-purple-500/20'>
					<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
						<div className='flex flex-col items-center text-center space-y-6'>
							<div className='text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent'>Fraud-dog</div>
							<p className='text-gray-400'>Protecting your business with intelligent fraud detection</p>
							
							{/* Built with Bolt Badge */}
							<BoltBadge variant="minimal" size="sm" />
							
							<div className='flex justify-center space-x-6 text-sm text-gray-400'>
								<a href='#' className='hover:text-purple-400 transition-colors'>
									Privacy Policy
								</a>
								<a href='#' className='hover:text-purple-400 transition-colors'>
									Terms of Service
								</a>
								<a href='#' className='hover:text-purple-400 transition-colors'>
									Contact
								</a>
							</div>
						</div>
					</div>
				</footer>

				{/* Custom Styles */}
				<style>{`
        @keyframes fadeStep {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.9);  
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .footstep { 
          opacity: 0;
        }

        .step-1.animate  { 
          animation: fadeStep 0.8s ease-out forwards;
          animation-delay: 0s;
        }

        .step-2.animate  {
          animation: fadeStep 0.8s ease-out forwards;
          animation-delay: 0.5s;
        }

        .step-3.animate  {
          animation: fadeStep 0.8s ease-out forwards;
          animation-delay: 1s;
        }

        .step-4.animate  {
          animation: fadeStep 0.8s ease-out forwards;
          animation-delay: 1.5s;
        } 

        .step-5.animate  {
          animation: fadeStep 0.8s ease-out forwards;
          animation-delay: 0.6s; 
          rotate:-45deg
        }
      `}</style>
			</div>

			{/* Auth Modal */}
			<AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} initialMode={authMode} />
		</>
	);
});

export default LandingPage;