import React, { useState, useEffect } from 'react'
import api from '../api/api'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, Mail, Lock, Store, User, ArrowLeft, Zap, Eye, EyeOff, Loader2 } from 'lucide-react'
import SearchableSelect from '../components/SearchableSelect'

export default function Register(){
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [shopId, setShopId] = useState('')
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const response = await api.get('/shops')
        setShops(response.data)
      } catch (err) {
        setMsg(err.response?.data?.msg || 'Error fetching shops')
      }
    }
    fetchShops()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!shopId) {
      setMsg('Please select an assigned shop')
      return
    }
    setLoading(true)
    setMsg('')
    try{
      await api.post('/auth/register', { name, email, password, shop_id: shopId })
      alert('Registration successful. Your account is pending admin verification.')
      navigate('/login')
    }catch(err){
      setMsg(err.response?.data?.msg || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f1f5f9] dark:bg-[#0f172a] p-4 md:p-6 transition-colors duration-300 relative overflow-y-auto">
      {/* BACK BUTTON */}
      <button
        onClick={() => navigate('/')}
        className="mb-8 md:absolute md:top-8 md:left-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-2.5 px-5 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 font-bold text-sm self-start md:self-auto"
      >
        <ArrowLeft size={18} /> BACK TO HOME
      </button>

      <div className="w-full max-w-lg mt-4 md:mt-0">
        <div className="text-center mb-6 md:mb-10">
          <div className="inline-flex bg-blue-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-200 mb-4">
            <UserPlus size={32} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight transition-colors">Create Account</h1>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium mt-2 transition-colors px-4">Join our network of gas retailers</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 transition-colors">
          {msg && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-bold mb-6 border border-red-100 dark:border-red-900/50 flex items-center gap-2 transition-colors animate-bounce">
              <span className="text-lg">⚠️</span> {msg}
            </div>
          )}

          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 outline-none font-bold text-gray-900 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600" 
                  value={name} 
                  onChange={e=>setName(e.target.value)} 
                  placeholder="Enter your name"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="email"
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 outline-none font-bold text-gray-900 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600" 
                  value={email} 
                  onChange={e=>setEmail(e.target.value)} 
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="w-full pl-12 pr-12 py-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 outline-none font-bold text-gray-900 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600" 
                  value={password} 
                  onChange={e=>setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">Assigned Shop</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={20} />
                <SearchableSelect
                  options={shops}
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  placeholder="Select Shop..."
                  className="pl-10"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className={`md:col-span-2 ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5'} text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-100 dark:shadow-none transition-all flex items-center justify-center gap-3 mt-4`}
            >
              {loading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  CREATING ACCOUNT...
                </>
              ) : (
                <>
                  <Zap size={24} fill="currentColor" /> CREATE ACCOUNT
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-50 dark:border-gray-700 text-center transition-colors">
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              Already have an account? <br/>
              <Link to="/login" className="text-blue-600 dark:text-blue-400 font-black hover:underline mt-1 inline-block uppercase tracking-wider text-sm">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
