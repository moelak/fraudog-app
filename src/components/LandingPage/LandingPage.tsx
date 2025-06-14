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
      // Store email and redirect to sign up
      localStorage.setItem('prefilledEmail', email);
      // Trigger sign up modal or redirect
      console.log('Getting started with email:', email);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-black"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        {/* Animated particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Sticky Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
               Fraud-dog
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {[
                { id: 'home', label: 'Home' },
                { id: 'features', label: 'Features' },
                { id: 'about', label: 'About' },
                { id: 'blog', label: 'Blog' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-3 py-2 text-sm font-medium transition-all duration-300 hover:text-purple-400 ${
                    activeSection === item.id 
                      ? 'text-purple-400 border-b-2 border-purple-400' 
                      : 'text-gray-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    Login
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25">
                    Sign Up
                  </button>
                </SignUpButton>
              </SignedOut>
            </div>
          </div>
        </div>
      </nav>

      {/* Section 1: Hero Header */}
      <section id="home" className="relative min-h-screen flex justify-center pt-16"> 
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-left lg:text-left z-10">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-600 bg-clip-text text-transparent leading-tight">
             24/7 Gen-AI co-pilot that stops fraud, not customers
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed"> 
             Fraudsters iterate in minutes; ChargeGuard AI responds in seconds. Our lightning-fast, explainable platform turns new attacks into instant countermeasures, slashing chargebacks while shielding growth of valuable customers.
            </p>
            
            {/* Email Signup Form */}
            <form onSubmit={handleGetStarted} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto lg:mx-0">
              {/* <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                required
              /> */} 
              <SignUpButton mode="modal">
              <button
                type="submit"
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 font-medium
             mx-auto md:mx-auto lg:mx-0 block"
              >
                Get Started
              </button>
              </SignUpButton>
            </form>
          </div>

          {/* Right Visual - Robot Image (2x Larger, No White Dots) */}
<div className="hidden lg:flex relative justify-end"> 
            <div className="relative">
              {/* Robot Image with Effects - Made 2x Larger */}
              <div className="relative w-[768px] h-[768px] mx-auto flex items-center justify-center">
                <div className="relative">
                  {/* Glowing background effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-3xl scale-150"></div>
                  
                  {/* Robot Image - 2x Larger (was 320px, now 640px) */}
                  <img 
                    src="/src/assets/images/robo.png" 
                    alt="AI Fraud Detection Robot" 
                    className="relative z-10 w-[580px] h-[580px] object-contain drop-shadow-2xl"
                    style={{
                      filter: 'drop-shadow(0 0 30px rgba(147, 51, 234, 0.3))'
                    }}
                  />
                     <img
      src="/src/assets/footsteps-1.svg" 
      alt="Footsteps"
      className="absolute z-0 bottom-32 left-1/2 transform -translate-x-1/2 translate-y-12 w-24 opacity-80"
    /> 

                                       <img
      src="/src/assets/footsteps-1.svg" 
      alt="Footsteps"
      className="absolute z-0 top-[75%] right-[50%] transform -translate-x-1/2 translate-y-12 w-24 opacity-80"
    />  

                                                         <img
      src="/src/assets/footsteps-1.svg" 
      alt="Footsteps"
      className="absolute z-0 top-[95%] right-[65%] transform -translate-x-1/2 translate-y-12 w-24 opacity-80"
    />  
        
              {/* Outer Ring */}
{/* <div className="absolute top-1/2  md:left-[75%] lg:left-[70%] md:w-[540px] md:h-[540px]   lg:w-[640px] lg:h-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-purple-400/10 animate-pulse"></div> */}

{/* Inner Ring */}
{/* <div className="absolute top-1/2  md:left-[75%]  lg:left-[70%] md:w-[500px] md:h-[500px]  lg:w-[600px] lg:h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/20 animate-pulse"></div> */} 
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Features */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Advanced AI Detection
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our cutting-edge algorithms analyze patterns, behaviors, and anomalies in real-time to protect your business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Real-Time Monitoring",
                description: "24/7 surveillance of all transactions with instant alerts",
                icon: "🔍"
              },
              {
                title: "Pattern Recognition",
                description: "Advanced ML models detect subtle fraud patterns",
                icon: "🧠"
              },
              {
                title: "Predictive Analytics",
                description: "Prevent fraud before it happens with predictive insights",
                icon: "🔮"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-xl p-8 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-4 text-purple-300">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: About / Use Case */}
      <section id="about" className=" py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Visual - Robot in Data Environment */}
          <div className="hidden lg:flex  relative  justify-center lg:justify-start">
            <div className="relative w-80 h-80">
              {/* Data Warehouse Background */}
              <div className="absolute inset-0  rounded-2xl  backdrop-blur-sm">
                {/* Data Streams */}
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-full h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent"
                    style={{
                      top: `${20 + i * 40}px`,
                      animation: `slideRight 3s infinite ${i * 0.5}s`
                    }}
                  />
                ))}
              </div>

              {/* Robot Image in Container */}
              <div className="absolute inset-0 flex items-center justify-center">  
                <div className="relative">
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full blur-2xl"></div>
                  
                  {/* Smaller robot image for this section */}
                  <img 
                    src="/src/assets/images/robo-thumbs-up.png" 
                    alt="AI Assistant Robot" 
                    className="relative z-10 w-58 h-58 object-contain opacity-80"
                    style={{
                      filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.2))'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="text-center lg:text-left">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Built for Analysts, Loved by Engineers
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Let our AI handle the complexity while you focus on decisions that matter. Our intuitive interface makes fraud detection accessible to everyone.
            </p>
            
            <div className="space-y-4">
              {[
                "Automated threat detection and response",
                "Customizable rules and thresholds",
                "Comprehensive reporting and analytics",
                "Seamless integration with existing systems"
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Blog Preview */}
      <section id="blog" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Latest Insights
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Stay updated with the latest trends in AI fraud detection and cybersecurity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "The Future of AI in Fraud Detection",
                excerpt: "Exploring how machine learning is revolutionizing fraud prevention...",
                date: "Dec 15, 2024"
              },
              {
                title: "Real-Time Analytics: A Game Changer",
                excerpt: "How instant data processing is transforming security protocols...",
                date: "Dec 12, 2024"
              },
              {
                title: "Building Resilient Financial Systems",
                excerpt: "Best practices for implementing robust fraud detection systems...",
                date: "Dec 10, 2024"
              }
            ].map((post, index) => (
              <article
                key={index}
                className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
              >
                <h3 className="text-xl font-semibold mb-3 text-purple-300">{post.title}</h3>
                <p className="text-gray-300 mb-4">{post.excerpt}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">{post.date}</span>
                  <button className="text-purple-400 hover:text-purple-300 transition-colors">
                    Read More →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
           Fraud-dog
          </div>
          <p className="text-gray-400 mb-6">
            Protecting your business with intelligent fraud detection
          </p>
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <a href="#" className="hover:text-purple-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-purple-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-purple-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes slideRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
});

export default LandingPage;