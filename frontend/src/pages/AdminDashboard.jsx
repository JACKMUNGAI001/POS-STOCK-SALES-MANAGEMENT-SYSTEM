import React, { useContext, useEffect, useState } from 'react'
import Card from '../components/Card'
import api from '../api/api'
import { AuthContext } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { UserCheck, UserX, MapPin, Mail, ShieldCheck, UserCircle, Store, CreditCard } from 'lucide-react'
import TransferCardLink from '../components/TransferCardLink'

export default function AdminDashboard(){
  const { user } = useContext(AuthContext)
  const [shops, setShops] = useState([])
  const [pendingAttendants, setPendingAttendants] = useState([])
  const [allAttendants, setAllAttendants] = useState([])
  const [managers, setManagers] = useState([])
  const [updatingManagerId, setUpdatingManagerId] = useState(null)
  const [salesSummary, setSalesSummary] = useState(null)
  const [financialOverview, setFinancialOverview] = useState(null)
  const [stockSummary, setStockSummary] = useState(null)
  const navigate = useNavigate()
    const [creditsSummary, setCreditsSummary] = useState(null)

  useEffect(()=> {
    api.get('/shops').then(res=>setShops(res.data)).catch(()=>{})
    fetchPendingAttendants()
    fetchAllAttendants()
    fetchManagers()
    
    // Unified dashboard summary call
    api.get('/reports/dashboard-summary').then(res => {
        const data = res.data;
        setSalesSummary(data.sales);
        setFinancialOverview(data.financial_overview);
        setStockSummary(data.stock_summary);
    }).catch(err => console.error("Error fetching summary", err));
      fetchCreditsSummary()
  },[])

  const fetchPendingAttendants = async () => {
    try {
      const response = await api.get('/admin/attendants/pending')
      setPendingAttendants(response.data)
    } catch (err) {
      console.error('Error fetching pending attendants')
    }
  }

  const fetchAllAttendants = async () => {
    try {
      const res = await api.get('/admin/attendants/all')
      setAllAttendants(res.data)
    } catch (err) {
      console.error('Error fetching all attendants')
    }
  }

  const fetchManagers = async () => {
    try {
      const response = await api.get('/admin/managers')
      setManagers(response.data)
    } catch (err) {
      console.error('Error fetching managers', err)
    }
  }

  const handleRestockPermission = async (manager) => {
    if (updatingManagerId !== null) return
    setUpdatingManagerId(manager.id)
    try {
      await api.patch(`/admin/managers/${manager.id}/restock-permission`, {
        can_restock: !manager.can_restock,
      })
      setManagers(current => current.map(item => (
        item.id === manager.id ? { ...item, can_restock: !item.can_restock } : item
      )))
    } catch (err) {
      alert(`Error updating permission: ${err.response?.data?.msg || err.message}`)
    } finally {
      setUpdatingManagerId(null)
    }
  }
  
    const fetchCreditsSummary = async () => {
      try{
        const res = await api.get('/reports/credits-summary')
        setCreditsSummary(res.data)
      }catch(err){ console.error('Error fetching credits summary', err) }
    }

  const handleVerifyAttendant = async (userId, shopId) => {
    if(!shopId) return;
    try {
      await api.patch(`/admin/attendants/${userId}/verify`, { is_verified: true, shop_id: shopId })
      alert('Attendant verified successfully!')
      fetchPendingAttendants()
      fetchAllAttendants()
    } catch (err) {
      alert(`Error verifying attendant: ${err.response?.data?.msg || err.message}`)
    }
  }

  const handleRemoveAttendant = async (userId) => {
    if(!window.confirm("Are you sure you want to remove this attendant?")) return;
    try {
      await api.delete(`/admin/attendants/${userId}`)
      alert('Attendant removed successfully!')
      fetchAllAttendants()
    } catch (err) {
      alert(`Error removing attendant: ${err.response?.data?.msg || err.message}`)
    }
  }

  const handleShopClick = (shopId) => {
    navigate(`/admin/shops/${shopId}`);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <>
        {/* QUICK ACTIONS SECTION */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 tracking-tight border-l-4 border-l-blue-600 pl-3 transition-colors text-sm uppercase tracking-widest text-gray-400 dark:text-gray-500">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/pos')}
              className="flex-1 bg-blue-600 text-white p-6 rounded-2xl shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3 text-center group"
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Store size={28} />
              </div>
              <div>
                <span className="block text-lg font-black uppercase tracking-tight">Record Sale</span>
                <span className="text-blue-100 text-xs font-medium">Process new checkout</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/pos/credit')}
              className="flex-1 bg-amber-600 text-white p-6 rounded-2xl shadow-lg shadow-amber-100 dark:shadow-none hover:bg-amber-700 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3 text-center group"
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <CreditCard size={28} />
              </div>
              <div>
                <span className="block text-lg font-black uppercase tracking-tight">Record Credit Sale</span>
                <span className="text-amber-100 text-xs font-medium">Create a customer credit account</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/admin/credit-sales')}
              className="flex-1 bg-violet-600 text-white p-6 rounded-2xl shadow-lg shadow-violet-100 dark:shadow-none hover:bg-violet-700 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3 text-center group"
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <CreditCard size={28} />
              </div>
              <div>
                <span className="block text-lg font-black uppercase tracking-tight">Credit Sales</span>
                <span className="text-violet-100 text-xs font-medium">View unpaid and paid sales</span>
              </div>
            </button>
          </div>
        </div>

        {/* STOCK SUMMARY BY CATEGORY */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight border-l-4 border-l-green-600 pl-3 transition-colors text-sm uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
            Stock Summary by Category
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stockSummary && Object.entries(stockSummary).map(([shopName, categories]) => (
                <div key={shopName} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-green-100 dark:border-gray-700 bg-gradient-to-br from-white to-green-50/30 dark:from-gray-800 dark:to-green-900/10 transition-all">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Store size={18} className="text-green-600 dark:text-green-400" />
                    {shopName}
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(categories).map(([category, quantity]) => (
                      <div key={category} className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-xl border border-gray-50 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{category}</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white bg-green-100 dark:bg-green-900/50 px-3 py-1 rounded-lg text-green-700 dark:text-green-400">{quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* SHOPS SECTION */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 tracking-tight transition-colors text-sm uppercase tracking-widest text-gray-400 dark:text-gray-500 border-l-4 border-l-blue-600 pl-3">Shops Management</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {shops.map(s => (
              <div key={s.id} onClick={() => handleShopClick(s.id)} className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-blue-100 dark:border-gray-700 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-green-900/10 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:-translate-y-1.5 transition-all cursor-pointer group relative">
                <div className="absolute top-4 right-4 bg-blue-100 dark:bg-blue-900/50 p-1 rounded-lg text-blue-600 dark:text-blue-400"><Store size={14} strokeWidth={3} /></div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{s.name}</h4>
                <div className="flex items-start gap-2 text-gray-500 dark:text-gray-400 text-sm transition-colors"><MapPin size={16} className="mt-0.5 shrink-0" /><span>{s.address}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* OVERVIEW SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
          <Card title="Total Sales" interactive={true} onClick={() => navigate('/admin/all-sales')}>
            {financialOverview ? formatCurrency(financialOverview.total_sales) : '...'}
          </Card>
          <Card title="Gross Profit" className="border-l-4 border-l-green-500">
            {financialOverview ? formatCurrency(financialOverview.gross_profit) : '...'}
          </Card>
          <Card title="Credit Sales" interactive={true} onClick={() => navigate('/admin/credit-sales')} className="group">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-extrabold">KES {Number(creditsSummary?.total_outstanding_amount || 0).toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">Outstanding: {creditsSummary ? creditsSummary.outstanding_count : '-'}</div>
              </div>
              <CreditCard className="text-blue-200 dark:text-blue-900/30 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors" />
            </div>
          </Card>
        </div>

        {/* SALES SUMMARY */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 tracking-tight border-l-4 border-l-blue-600 pl-3 transition-colors text-sm uppercase tracking-widest text-gray-400 dark:text-gray-500">Sales Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Link to="/attendant/sales" className="no-underline"><Card title="Today's Sales" interactive={true} className="!p-4 sm:!p-6">{salesSummary ? formatCurrency(salesSummary.today) : '...'}</Card></Link>
            <Link to="/attendant/sales/week" className="no-underline"><Card title="This Week's" interactive={true} className="!p-4 sm:!p-6">{salesSummary ? formatCurrency(salesSummary.week) : '...'}</Card></Link>
            <Link to="/attendant/sales/month" className="no-underline"><Card title="This Month's" interactive={true} className="!p-4 sm:!p-6">{salesSummary ? formatCurrency(salesSummary.month) : '...'}</Card></Link>
            <Link to="/attendant/sales/year" className="no-underline"><Card title="This Year's" interactive={true} className="!p-4 sm:!p-6">{salesSummary ? formatCurrency(salesSummary.year) : '...'}</Card></Link>
          </div>
        </div>

        {/* TRANSFER HISTORY */}
        <TransferCardLink />

        <div className="mt-10">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 tracking-tight border-l-4 border-l-amber-500 pl-3 text-sm uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Manager Restock Permission
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {managers.length === 0 ? (
              <div className="p-6 text-center text-gray-400 dark:text-gray-500 italic">No managers registered.</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {managers.map(manager => (
                  <div key={manager.id} className="p-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{manager.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{manager.email} · All products</p>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full transition-colors ${manager.can_restock ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {manager.can_restock ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={manager.can_restock}
                        disabled={updatingManagerId !== null}
                        onClick={() => handleRestockPermission(manager)}
                        className={`relative w-[62px] h-9 rounded-full p-1 shadow-inner transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:cursor-wait disabled:opacity-60 ${manager.can_restock ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'}`}
                        title={manager.can_restock ? 'Disable restocking' : 'Enable restocking'}
                      >
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-out ${manager.can_restock ? 'translate-x-[26px]' : 'translate-x-0'}`}>
                          <span className={`h-2 w-2 rounded-full ${manager.can_restock ? 'bg-green-500' : 'bg-gray-400'}`} />
                        </span>
                        <span className="sr-only">{manager.can_restock ? 'Disable' : 'Enable'} restocking for {manager.name}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20 mt-10">
          {/* PENDING ATTENDANTS */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 tracking-tight transition-colors text-sm uppercase tracking-widest text-gray-400 dark:text-gray-500 border-l-4 border-l-orange-600 pl-3">Pending Attendants</h3>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
              {pendingAttendants.length === 0 ? (<div className="p-8 text-center text-gray-400 dark:text-gray-500 italic">No pending attendants.</div>) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {pendingAttendants.map(attendant => (
                    <div key={attendant.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500"><UserCircle size={32} /></div>
                        <div><p className="font-bold text-gray-900 dark:text-white">{attendant.name}</p><div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm"><Mail size={14} /><span>{attendant.email}</span></div></div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select className="flex-1 sm:flex-none p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" onChange={(e) => handleVerifyAttendant(attendant.id, e.target.value)}>
                          <option value="">Assign Shop</option>
                          {shops.map(shop => (<option key={shop.id} value={shop.id}>{shop.name}</option>))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ALL ATTENDANTS */}
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 tracking-tight transition-colors text-sm uppercase tracking-widest text-gray-400 dark:text-gray-500 border-l-4 border-l-blue-600 pl-3">All Attendants</h3>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
              {allAttendants.length === 0 ? (<div className="p-8 text-center text-gray-400 dark:text-gray-500 italic">No attendants registered.</div>) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {allAttendants.map(attendant => (
                    <div key={attendant.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative"><div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400"><UserCircle size={32} /></div>{attendant.is_verified && (<div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 transition-colors"><ShieldCheck size={16} className="text-green-500" fill="currentColor" /></div>)}</div>
                        <div><div className="flex items-center gap-2"><p className="font-bold text-gray-900 dark:text-white">{attendant.name}</p>{attendant.is_verified && <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Verified</span>}</div><div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-xs transition-colors"><span className="flex items-center gap-1"><Mail size={12} /> {attendant.email}</span><span className="flex items-center gap-1"><Store size={12} /> {attendant.shop_name || "Unassigned"}</span></div></div>
                      </div>
                      <button onClick={() => handleRemoveAttendant(attendant.id)} className="w-full sm:w-auto bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"><UserX size={16} /> Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
    </>
  )
}
