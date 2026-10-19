import React, { useEffect, useState } from 'react'
import api, { API_BASE } from '../api/api'
import { FileText, Store, Wallet } from 'lucide-react'

export default function OutstandingCredits(){
  const [credits, setCredits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCredits() }, [])

  const fetchCredits = async () => {
    setLoading(true)
    try{
      const res = await api.get('/reports/outstanding-credits')
      setCredits(res.data)
    }catch(err){
      console.error('Error fetching outstanding credits', err)
    }finally{ setLoading(false) }
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
      fetchCredits()
    }catch(err){ alert(`Error recording payment: ${err.response?.data?.msg || err.message}`) }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-black">Outstanding Credit Sales</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-4">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : credits.length === 0 ? (
          <div className="p-8 text-center">No outstanding credits.</div>
        ) : (
          <div className="space-y-3 md:hidden">
            {credits.map(c => <article key={c.id} className="rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">Sale #{c.id}</h2><p className="text-sm text-gray-500">{c.shop_name || 'Van sale'}{c.attendant_name ? ` · ${c.attendant_name}` : ''}</p><p className="text-xs text-gray-500 mt-1">{c.customer_name || 'Customer not named'}{c.customer_phone ? ` · ${c.customer_phone}` : ''}</p></div><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">Unpaid</span></div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-xs"><div><span className="block text-gray-500">Total</span><strong>KES {Number(c.total_amount).toLocaleString()}</strong></div><div><span className="block text-gray-500">Paid</span><strong>KES {Number(c.paid_amount).toLocaleString()}</strong></div><div><span className="block text-gray-500">Remaining</span><strong className="text-amber-700">KES {Number(c.remaining).toLocaleString()}</strong></div></div>
              <div className="mt-4 flex gap-2"><button onClick={() => handlePay(c)} className="flex-1 bg-green-50 text-green-700 px-3 py-2 rounded-lg inline-flex items-center justify-center gap-2 font-bold"><Wallet size={14} /> Record payment</button>{c.receipt_uuid && <a href={`${API_BASE}/receipts/${c.receipt_uuid}`} target="_blank" rel="noreferrer" aria-label="View receipt" className="border rounded-lg px-3 py-2 text-blue-600"><FileText size={16} /></a>}</div>
            </article>)}
          </div>
        )}
        {!loading && credits.length > 0 && <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Shop</th>
                <th className="px-4 py-2 text-left">Attendant</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Paid</th>
                <th className="px-4 py-2 text-right">Remaining</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {credits.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3">#{c.id}</td>
                  <td className="px-4 py-3">{c.shop_name}</td>
                  <td className="px-4 py-3">{c.attendant_name}</td>
                  <td className="px-4 py-3 text-right">KES {Number(c.total_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">KES {Number(c.paid_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-bold">KES {Number(c.remaining).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handlePay(c)} className="bg-green-50 text-green-600 px-3 py-1 rounded-lg inline-flex items-center gap-2">
                      <Wallet size={14} /> PAY
                    </button>
                    {c.receipt_uuid && (
                      <a href={`${API_BASE}/receipts/${c.receipt_uuid}`} target="_blank" rel="noreferrer" className="ml-2 text-blue-600"> <FileText size={14} /> </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>}
      </div>
    </div>
  )
}
