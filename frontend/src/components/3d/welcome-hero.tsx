"use client"

import { motion } from "framer-motion"
import { Sparkles, Zap, Shield, TrendingUp, Users, BookOpen } from "lucide-react"

const features = [
  { icon: Shield, title: "Bank-Level Security", desc: "Enterprise-grade encryption & audit trails" },
  { icon: Zap, title: "Lightning Fast", desc: "Real-time sync & instant updates" },
  { icon: TrendingUp, title: "Smart Analytics", desc: "AI-powered insights & forecasting" },
  { icon: Users, title: "Multi-Role Access", desc: "13 role-based dashboards" },
  { icon: BookOpen, title: "Complete ERP", desc: "Finance, HR, Academic & more" },
  { icon: Sparkles, title: "Modern Design", desc: "2026 cutting-edge UI/UX" },
]

export function WelcomeHero() {

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950" />
      
      {/* Animated mesh gradient */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

      <div className="relative z-10 container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100/50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 mb-8"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Welcome to ZENOVA ERP 2026
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 leading-tight"
          >
            Transform Your
            <br />
            School Management
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            The most advanced, secure, and beautiful school management platform.
            <br />
            <span className="text-gray-500 dark:text-gray-400">Built for the future of education.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <motion.a
              href="/login"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/40 transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            </motion.a>

            <motion.a
              href="/activate"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl font-semibold shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
            >
              Activate License
            </motion.a>
          </motion.div>

          {/* Features grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group relative p-6 rounded-2xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Floating elements */}
        <div className="absolute top-1/4 left-10 w-20 h-20 bg-indigo-400/20 rounded-full blur-2xl animate-float" />
        <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl animate-float animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-pink-400/20 rounded-full blur-2xl animate-float animation-delay-4000" />
      </div>
    </div>
  )
}