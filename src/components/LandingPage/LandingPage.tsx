import { observer } from 'mobx-react-lite';
import { SignInButton, SignUpButton, SignedOut } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';
import { landingPageStore } from './LandingPageStore';

const LandingPage = observer(() => {
  const [email, setEmail] = useState('');
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'features', 'about', 'blog'];
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      localStorage.setItem('prefilledEmail', email);
      console.log('Getting started with email:', email);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white overflow-x-hidden">
      <section id="home" className="relative min-h-screen flex justify-center items-center pt-16 md:pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="z-10 text-left">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-600 bg-clip-text text-transparent leading-tight">
              24/7 Gen-AI co-pilot that stops fraud, not customers
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
              Fraudsters iterate in minutes; ChargeGuard AI responds in seconds. Our lightning-fast, explainable platform turns new attacks into instant countermeasures, slashing chargebacks while shielding growth of valuable customers.
            </p>
            <form onSubmit={handleGetStarted} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto lg:mx-0">
              <SignUpButton mode="modal">
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 font-medium mx-auto md:mx-auto lg:mx-0 block"
                >
                  Get Started
                </button>
              </SignUpButton>
            </form>
          </div>

          <div className="hidden lg:flex relative justify-end">
            <div className="relative w-[768px] h-[768px] mx-auto flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-3xl scale-150"></div>
                <img
                  src="/src/assets/images/robo.png"
                  alt="AI Fraud Detection Robot"
                  src="/src/assets/images/robo.png"
                  alt="AI Fraud Detection Robot"
                  className="relative z-10 w-[580px] h-[580px] object-contain drop-shadow-2xl"
                  style={{ filter: 'drop-shadow(0 0 30px rgba(147, 51, 234, 0.3))' }}
                />
                {[0, 1, 2, 3].map((_, idx) => (
                  <img
                    key={idx}
                    src="/src/assets/footsteps-1.svg"
                    alt="Footsteps"
                    className={`absolute z-0 w-24 opacity-80 transition-opacity duration-700 ease-in-out animate-fadeIn delay-[${idx * 300}ms]`}
                    style={{
                      top: `${75 + idx * 15}%`,
                      right: `${50 + idx * 8}%`,
                      transform: `translate(-50%, 0) rotate(${idx % 2 === 0 ? 5 : -5}deg)`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add animation style */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 1s forwards;
        }
      `}</style>
    </div>
  );
});

export default LandingPage;
