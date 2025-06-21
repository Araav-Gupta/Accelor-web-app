import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import logo from '../assets/logo1.png';
import { RetroGrid } from '../components/magicui/RetroGrid';
import { TypingAnimation } from '../components/magicui/TypingAnimation';
import { ShineBorder } from '../components/magicui/ShineBorder';
import GlareCard from '../components/magicui/GlareCard';
import { cn } from '../components/lib/utils';
import { motion } from 'framer-motion';

function AnimatedShinyButton({ children, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full px-6 py-3 text-white font-medium rounded-md bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
        "transition-all duration-300 ease-in-out",
        "hover:shadow-lg hover:shadow-indigo-500/50",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        "before:animate-shine before:bg-[length:200%_100%]",
        className
      )}
    >
      {children}
    </button>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const loggedInUser = await login(email, password);
      if (!loggedInUser || !loggedInUser.loginType) {
        alert('Login failed: Invalid user type');
        return;
      }
      const userType = loggedInUser.loginType.toLowerCase();
      if (userType === 'employee') {
        navigate(`/${userType}/employee-dashboard`);
      } else {
        navigate(`/${userType}/dashboard`);
      }
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <div className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-white">
      {/* Retro Grid Background */}
      <RetroGrid opacity={0.5} cellSize={80} color="#d1d5db" />

      {/* Logo with Animation */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="mb-6"
      >
        <img src={logo} alt="Company Logo" className="w-48 h-auto" />
      </motion.div>

      {/* Typing Animation Text */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="mb-8"
      >
        <TypingAnimation
          children="WELCOME TO HR MANAGEMENT SYSTEM"
          className="text-center text-4xl font-bold uppercase"
          style={{
            background: 'linear-gradient(90deg, #000000, #6b21a8, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
          duration={50}
        />
      </motion.div>

      {/* Login Card with Animation */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <GlareCard className="relative z-10 w-full max-w-lg p-6">
          <ShineBorder
            borderWidth={2}
            duration={8}
            shineColor={["#000000", "#6b21a8", "#ec4899"]}
          >
            {/* Wrapper to ensure ShineBorder visibility */}
            <div className="p-1">
              <div className="relative w-full bg-white rounded-none p-6 shadow-2xl">
                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 placeholder-gray-400"
                    />
                  </div>
                  <div className="relative">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all duration-200 placeholder-gray-400"
                    />
                    {password && password.length < 6 && (
                      <p className="text-sm text-red-600 mt-1">
                        Minimum 6 characters required
                      </p>
                    )}
                  </div>
                  <AnimatedShinyButton type="submit">
                    Login
                  </AnimatedShinyButton>
                </form>
              </div>
            </div>
          </ShineBorder>
        </GlareCard>
      </motion.div>
    </div>
  );
}

export default Login;