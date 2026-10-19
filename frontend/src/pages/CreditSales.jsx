import React, { useContext, useEffect, useState } from 'react'
import api, { API_BASE } from '../api/api'
import { Wallet, FileText, Edit, Trash2 } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'
import EditSaleModal from '../components/EditSaleModal'
import MobileSaleCard from '../components/MobileSaleCard'

export default function CreditSales(){
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingSale, setEditingSale] = useState(null)
  const [activeSection, setActiveSection] = useState('unpaid')
  const [channel, setChannel] = useState('shop')
  const [vans, setVans] = useState([])
  const [vanId, setVanId] = useState('')
  const { user } = useContext(AuthContext)

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') api.get('/vans').then(r => setVans(r.data)).catch(() => {})
  }, [user])
  useEffect(() => { fetchSales() }, [channel, vanId])

  const fetchSales = async () => {
    setLoading(true)
    try{
      const res = await api.get('/reports/credit-sales', { params: channel === 'van' ? { van_id: vanId || undefined } : {} })
      setSales(res.data)
    }catch(err){ console.error('Error fetching credit sales', err) }
    finally{ setLoading(false) }
  }

  const handlePay = async (sale) => {
    const remaining = (sale.total_amount || 0) - (sale.paid_amount || 0)
    const input = window.prompt(`Enter payment amount (remaining KES ${remaining}):`, "")
    if (!input) return
    const amount = parseFloat(input)
    if (isNaN(amount) || amount <= 0) { alert('Please enter a valid amount'); return }
    try{
      await api.post(`/sales/${sale.id}/payments`, { amount })
      alert('Payment recorded')
      fetchSales()
    }catch(err){ alert(`Error recording payment: ${err.response?.data?.msg || err.message}`) }
  }

  const handleDelete = async (sale) => {
    const confirmed = window.confirm(
      `Delete credit sale #${sale.id}? This will restore its items to stock and remove the sale from totals.`
    )
    if (!confirmed) return

    try {
      await api.delete(`/sales/${sale.id}`)
      alert('Credit sale deleted and stock restored successfully.')
      fetchSales()
    } catch (err) {
      alert(`Error deleting sale: ${err.response?.data?.msg || err.message}`)
    }
  }

  const unpaidSales = sales.filter((sale) => sale.status !== 'paid')
  const paidSales = sales.filter((sale) => sale.status === 'paid')
  const displayedSales = activeSection === 'unpaid' ? unpaidSales : paidSales

  const productSummary = (sale) => {
    const products = sale.products || sale.items || []
    if (products.length === 0) return '—'
    return products.map((product, index) => (
      <div key={`${product.item_id}-${index}`} className="whitespace-nowrap">
        {product.item_name || 'N/A'} <span className="text-gray-500">× {product.qty}</span>
      </div>
    ))
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black">{user?.role === 'attendant' ? 'Van Credit Sales' : 'Credit Sales'}</h1>
      </div>
      {(user?.role === 'admin' || user?.role === 'manager') && <div className="mb-5 flex flex-wrap gap-3">
        <select value={channel} onChange={e => { setChannel(e.target.value); setVanId('') }} className="p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700"><option value="shop">Shop credits</option>{user?.role === 'admin' && <option value="van">Van credits</option>}</select>
        {channel === 'van' && <select value={vanId} onChange={e => setVanId(e.target.value)} className="p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700"><option value="">All vans</option>{vans.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select>}
      </div>}
      <div className="mb-4 flex gap-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveSection('unpaid')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-colors ${activeSection === 'unpaid' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          Unpaid Sales ({unpaidSales.length})
        </button>
        <button
          onClick={() => setActiveSection('paid')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-colors ${activeSection === 'paid' ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          Paid Sales ({paidSales.length})
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-4 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : displayedSales.length === 0 ? (
          <div className="p-8 text-center">No {activeSection} credit sales found.</div>
        ) : (
          <>
          <div className="space-y-3 md:hidden">
            {displayedSales.map((sale) => (
              <MobileSaleCard
                key={sale.id}
                sale={sale}
                additionalDetails={<>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3"><span className="font-medium text-gray-500 dark:text-gray-400">Customer:</span><span className="text-right font-semibold text-gray-800 dark:text-gray-100">{sale.customer_name || '—'}</span></div>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3"><span className="font-medium text-gray-500 dark:text-gray-400">Contact:</span><span className="text-right font-semibold text-gray-800 dark:text-gray-100">{sale.customer_phone || '—'}</span></div>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3"><span className="font-medium text-gray-500 dark:text-gray-400">Status:</span><span className="text-right font-bold uppercase text-gray-800 dark:text-gray-100">{sale.status || '—'}</span></div>
                </>}
                actions={<>
                  {sale.status !== 'paid' && <button onClick={() => handlePay(sale)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-green-300 px-3 py-2 text-xs font-bold text-green-600"><Wallet size={14} /> PAY</button>}
                  {user?.role === 'admin' && <>{!sale.van_id && <button onClick={() => setEditingSale(sale)} className="rounded-lg border border-amber-300 p-2 text-amber-600" title="Edit credit sale"><Edit size={16} /></button>}<button onClick={() => handleDelete(sale)} className="rounded-lg border border-red-300 p-2 text-red-600" title="Delete credit sale"><Trash2 size={16} /></button></>}
                  {sale.receipt_uuid && <a href={`${API_BASE}/receipts/${sale.receipt_uuid}`} target="_blank" rel="noreferrer" className="rounded-lg border border-blue-300 p-2 text-blue-600" title="View receipt"><FileText size={16} /></a>}
                </>}
              />
            ))}
          </div>
          <table className="hidden w-full text-sm md:table">
            <thead className="text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Shop</th>
                <th className="px-4 py-2 text-left">Attendant</th>
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-left">Contact</th>
                <th className="px-4 py-2 text-left">Product(s)</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Paid</th>
                <th className="px-4 py-2 text-right">Remaining</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedSales.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3">#{c.id}</td>
                  <td className="px-4 py-3">{c.shop_name}</td>
                  <td className="px-4 py-3">{c.attendant_name}</td>
                  <td className="px-4 py-3 font-medium">{c.customer_name || '—'}</td>
                  <td className="px-4 py-3">{c.customer_phone || '—'}</td>
                  <td className="px-4 py-3">{productSummary(c)}</td>
                  <td className="px-4 py-3 text-right">KES {Number(c.total_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">KES {Number(c.paid_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-bold">KES {Number(c.remaining).toLocaleString()}</td>
                  <td className="px-4 py-3">{c.status?.toUpperCase()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {c.status !== 'paid' && (
                        <button onClick={() => handlePay(c)} className="bg-green-50 text-green-600 px-3 py-1 rounded-lg inline-flex items-center gap-2" title="Record payment">
                          <Wallet size={14} /> PAY
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <>
                          {!c.van_id && <button
                            onClick={() => setEditingSale(c)}
                            className="bg-amber-50 text-amber-600 p-2 rounded-lg hover:bg-amber-600 hover:text-white transition-all"
                            title="Edit credit sale"
                          >
                            <Edit size={16} />
                          </button>}
                          <button
                            onClick={() => handleDelete(c)}
                            className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                            title="Delete credit sale and restore stock"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {c.receipt_uuid && (
                        <a href={`${API_BASE}/receipts/${c.receipt_uuid}`} target="_blank" rel="noreferrer" className="text-blue-600" title="View receipt">
                          <FileText size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>
      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onUpdate={fetchSales}
        />
      )}
    </div>
  )
}
