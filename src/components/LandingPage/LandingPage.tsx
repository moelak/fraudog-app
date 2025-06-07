import { observer } from 'mobx-react-lite';
import { SignInButton, SignUpButton, SignedOut } from '@clerk/clerk-react';
import { landingPageStore } from './LandingPageStore';

const LandingPage = observer(() => {
  return (
    <div 
      className="min-h-screen relative bg-cover bg-center"
      style={{
        backgroundImage: `url('${landingPageStore.backgroundImage}')`
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-70 bg-pattern"></div>

      <div className="relative min-h-screen flex flex-col">
        <nav className="bg-transparent p-4">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <div className="text-white text-2xl font-bold">{landingPageStore.brandName}</div>
            <div className="flex gap-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="px-6 py-2 text-white border border-white rounded-lg hover:bg-white hover:text-black transition-colors">
                    Log in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Sign up
                  </button>
                </SignUpButton>
              </SignedOut>
            </div>
          </div>
        </nav>

        <main className="flex-grow flex items-center px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              {landingPageStore.heroTitle}
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-12 leading-relaxed">
              {landingPageStore.heroDescription}
            </p>
            <div className="flex gap-6">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg">
                    Get Started
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-black transition-colors text-lg">
                    Learn More
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
});

export default LandingPage;