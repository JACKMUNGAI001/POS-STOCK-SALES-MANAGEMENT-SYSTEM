import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api, { API_BASE } from '../api/api'
import { formatDate } from '../utils/helpers'
import { CheckCircle } from 'lucide-react'

export default function ShopSales(){
  const { shopId } = useParams()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalSales, setTotalSales] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/sales/shop/${shopId}`, { params: { page: currentPage, per_page: 25 } })
        setSales(res.data.sales)
        setTotalSales(res.data.total)
        setTotalPages(res.data.pages)
      } catch (err){
        console.error('Error fetching shop sales', err)
      } finally { setLoading(false) }
    }
    fetch()
  }, [shopId, currentPage])

  return (
    <div className="p-3 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-black mb-4">Shop Sales History</h1>
      {loading ? <div className="p-6">Loading...</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-4 overflow-auto">
          {sales.length === 0 ? <div className="p-10 text-center text-gray-400">No sales recorded.</div> : (
            <>
            <div className="space-y-3 md:hidden">{sales.map(s => <article key={s.id} className="rounded-xl border border-gray-100 dark:border-gray-700 p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">Sale #{s.id}</h2><p className="text-sm text-gray-500">{formatDate(s.created_at)}</p></div><strong className="shrink-0">KES {Number(s.total_amount || 0).toLocaleString()}</strong></div><div className="mt-3 flex flex-wrap gap-1">{s.items?.map((it, i) => <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{it.item_name} × {it.qty}</span>)}</div>{s.receipt_uuid && <a href={`${API_BASE}/receipts/${s.receipt_uuid}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-600"><CheckCircle size={14}/> Receipt</a>}</article>)}</div>
            <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[650px] text-left">
              <thead className="text-xs text-gray-500 uppercase font-black">
                <tr><th className="px-4 py-2">ID</th><th className="px-4 py-2">Items</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Date</th><th className="px-4 py-2">Receipt</th></tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-2 font-bold">{s.id}</td>
                    <td className="px-4 py-2"><div className="flex flex-wrap gap-1">{s.items?.map((it, i) => <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{it.item_name} x{it.qty}</span>)}</div></td>
                    <td className="px-4 py-2 font-black">{s.total_amount}</td>
                    <td className="px-4 py-2">{formatDate(s.created_at)}</td>
                    <td className="px-4 py-2">{s.receipt_uuid ? <a href={`${API_BASE}/receipts/${s.receipt_uuid}`} target="_blank" rel="noreferrer" className="text-blue-600"><CheckCircle size={14}/> View</a> : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            </>
          )}
        </div>
      )}
      {!loading && totalPages > 1 && (
        <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(currentPage - 1) * 25 + 1}–{Math.min(currentPage * 25, totalSales)} of {totalSales}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700"
            >
              Previous
            </button>
            <span className="self-center text-sm font-bold text-gray-600 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
