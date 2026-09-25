import { useContext } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Sun, Moon, ArrowRight, ShieldCheck, Zap, BarChart3 } from "lucide-react";
import { ThemeContext } from "../context/ThemeContext";

export default function Landing() {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#0f172a] transition-colors duration-300 font-sans">
      
      {/* NAVBAR */}
      <nav className="flex flex-col sm:flex-row items-center justify-between px-6 md:px-16 py-8 gap-6">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <Zap size={24} fill="currentColor" />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight text-center sm:text-left">GAS POS SYSTEM</h1>
        </div>
        
        <div className="flex items-center space-x-4 md:space-x-6">
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition-all"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link to="/login" className="text-gray-600 dark:text-gray-400 font-bold hover:text-blue-600 transition-colors text-sm md:text-base">
            Login
          </Link>
          <Link
            to="/register"
            className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all text-sm md:text-base whitespace-nowrap"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="flex flex-col items-center text-center px-6 mt-16 md:mt-24 pb-20">
        <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-8 border border-blue-100 dark:border-blue-800">
          <ShieldCheck size={14} /> Trusted by retailers nationwide
        </div>
        
        <h1 className="text-4xl md:text-7xl font-black text-gray-900 dark:text-white leading-[1.1] max-w-4xl tracking-tighter transition-colors">
          Smart <span className="text-blue-600">Inventory</span> &  
          <span className="text-blue-600 italic"> Sales</span> Management
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mt-8 max-w-2xl text-lg md:text-xl font-medium leading-relaxed">
          The all-in-one platform for gas businesses to track every sale, 
          manage stock across multiple shops, and analyze profits in real-time.
        </p>

        <div className="flex flex-col md:flex-row gap-6 mt-12">
          <Link
            to="/login"
            className="px-10 py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-lg shadow-2xl hover:bg-gray-800 dark:hover:bg-gray-100 hover:-translate-y-1 transition-all flex items-center gap-2"
          >
            Start Managing <ArrowRight size={20} />
          </Link>

          <Link
            to="/register"
            className="px-10 py-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-1 transition-all"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 md:px-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto pb-32">
        <FeatureCard
          icon={BarChart3}
          title="Profit Analysis"
          desc="Automated P&L reports for individual shops or your entire business empire."
          color="blue"
        />
        <FeatureCard
          icon={Zap}
          title="Instant POS"
          desc="Lightning-fast sales recording with automated receipt generation for customers."
          color="purple"
        />
        <FeatureCard
          icon={ShieldCheck}
          title="Stock Security"
          desc="Real-time stock tracking and low-inventory alerts to keep your shops running."
          color="green"
        />
      </section>
    </div>
  );
}

function FeatureCard({ title, desc, icon: Icon, color }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    green: 'text-green-600 bg-green-50'
  }
  return (
    <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-2 transition-all group">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 ${colors[color]}`}>
        <Icon size={32} />
      </div>
      <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 transition-colors">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
