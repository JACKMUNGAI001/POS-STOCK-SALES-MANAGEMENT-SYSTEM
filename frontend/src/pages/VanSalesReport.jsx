import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/api'

export default function VanSalesReport() {
  const location = useLocation()
  const navigate = useNavigate()
  const [vans, setVans] = useState([])
  const [vanId, setVanId] = useState(new URLSearchParams(location.search).get('van_id') || '')
  const [sales, setSales] = useState([])
  const [movements, setMovements] = useState([])
  const [summary, setSummary] = useState(null)
  const [salesPage, setSalesPage] = useState(1)
  const [movementPage, setMovementPage] = useState(1)
  const [salesMeta, setSalesMeta] = useState({ total: 0, pages: 0 })
  const [movementMeta, setMovementMeta] = useState({ total: 0, pages: 0 })

  useEffect(() => { api.get('/vans').then(({ data }) => setVans(data)).catch(() => {}) }, [])
  useEffect(() => {
    if (!vanId) return
    Promise.all([
      api.get(`/sales/van/${vanId}?page=${salesPage}&per_page=20`),
      api.get(`/vans/${vanId}/movements?page=${movementPage}&per_page=20`),
      api.get(`/vans/${vanId}/reconciliation`),
    ]).then(([salesResponse, movementsResponse, summaryResponse]) => {
      setSales(salesResponse.data.sales || [])
      setSalesMeta({ total: salesResponse.data.total || 0, pages: salesResponse.data.pages || 0 })
      setMovements(movementsResponse.data.items || [])
      setMovementMeta({ total: movementsResponse.data.total || 0, pages: movementsResponse.data.pages || 0 })
      setSummary(summaryResponse.data)
    }).catch(error => alert(error.response?.data?.msg || error.message))
  }, [vanId, salesPage, movementPage])

  const selectVan = id => {
    setVanId(id)
    setSalesPage(1)
    setMovementPage(1)
    setSummary(null)
    setSales([])
    setMovements([])
    navigate(id ? `/admin/vans/sales?van_id=${id}` : '/admin/vans/sales')
  }
  const selectedVan = vans.find(van => String(van.id) === String(vanId))

  return <div className="mx-auto max-w-4xl space-y-5">
    <header><h1 className="text-2xl font-black">Van sales & reconciliation</h1><p className="mt-1 text-sm text-gray-500">Review customer sales, cylinder collections, depot refills, and outstanding credit by van.</p></header>
    <select value={vanId} onChange={event => selectVan(event.target.value)} className="w-full rounded-xl border bg-white p-3 dark:border-gray-700 dark:bg-gray-800"><option value="">Choose van</option>{vans.map(van => <option key={van.id} value={van.id}>{van.registration_number}</option>)}</select>
    {vanId && <>
      <section className="rounded-2xl bg-white p-5 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-bold">Reconciliation · {selectedVan?.registration_number}</h2>
        <p className="mb-3 text-sm text-gray-500">{summary?.sale_count || 0} sales ({summary?.regular_sale_count || 0} regular, {summary?.credit_sale_count || 0} credit).</p>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20"><div className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">Empties collected</div><div className="mt-1 text-2xl font-black">{summary?.customer_empty_count || 0}</div></div>
          <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20"><div className="text-xs font-bold uppercase text-blue-700 dark:text-blue-300">Filled at depot</div><div className="mt-1 text-2xl font-black">{summary?.refilled_count || 0}</div><p className="mt-1 text-xs">Empties handed in: {summary?.depot_empty_count || 0}</p></div>
          <div className="rounded-xl bg-green-50 p-4 dark:bg-green-900/20"><div className="text-xs font-bold uppercase text-green-700 dark:text-green-300">Filled cylinders sold</div><div className="mt-1 text-2xl font-black">{summary?.sold_count || 0}</div></div>
        </div>
        <p className="font-semibold">Sales value: KES {summary?.gross_sales || 0} · Credit owed: KES {summary?.outstanding_credit || 0}</p>
      </section>
      <section className="rounded-2xl bg-white p-5 dark:bg-gray-800"><h2 className="mb-3 text-lg font-bold">Sales ({salesMeta.total})</h2>
        {sales.length ? sales.map(sale => <article key={sale.id} className="flex flex-col gap-1 border-t py-3 dark:border-gray-700"><div className="flex flex-wrap gap-x-4 font-semibold"><span>Sale #{sale.id}</span><span>Buyer: {sale.customer_name || 'Not named'}</span><span>Total: KES {sale.total_amount}</span><span>{sale.sale_type === 'credit' ? `Credit · ${sale.status}` : `Regular · ${sale.payment_type || 'Paid'}`}</span><span>{new Date(sale.created_at).toLocaleString()}</span></div><div className="text-sm text-gray-600 dark:text-gray-300">{sale.items?.map(item => `${item.item_name}: ${item.qty} sold × KES ${item.unit_price}`).join(' · ')}</div></article>) : <p className="text-gray-500">No recorded sales for this van.</p>}
        <div className="mt-3 flex items-center justify-between text-sm"><span>Page {salesPage} of {Math.max(salesMeta.pages, 1)}</span><div className="flex gap-2"><button disabled={salesPage <= 1} onClick={() => setSalesPage(page => page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={salesPage >= salesMeta.pages} onClick={() => setSalesPage(page => page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div>
      </section>
      <section className="rounded-2xl bg-white p-5 dark:bg-gray-800"><h2 className="mb-3 text-lg font-bold">Stock movements ({movementMeta.total})</h2>
        {movements.length ? movements.map(row => <article key={row.id} className="flex flex-wrap gap-x-4 gap-y-1 border-t py-2 text-sm dark:border-gray-700"><span>{row.movement_type.replaceAll('_', ' ')}</span><span>{row.item_name}</span><strong className={row.quantity < 0 ? 'text-red-600' : 'text-green-700'}>{row.quantity > 0 ? '+' : ''}{row.quantity}</strong><span>{row.supplier_name ? `Supplier: ${row.supplier_name} · ` : ''}{row.reference}{row.empty_quantity ? ` · ${row.empty_quantity} empties sent to depot` : ''}</span><span className="text-gray-500">{new Date(row.created_at).toLocaleString()}</span></article>) : <p className="text-gray-500">No stock movements yet.</p>}
        <div className="mt-3 flex items-center justify-between text-sm"><span>Page {movementPage} of {Math.max(movementMeta.pages, 1)}</span><div className="flex gap-2"><button disabled={movementPage <= 1} onClick={() => setMovementPage(page => page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={movementPage >= movementMeta.pages} onClick={() => setMovementPage(page => page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div>
      </section>
    </>}
  </div>
}
