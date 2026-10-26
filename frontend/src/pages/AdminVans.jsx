import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/api'
import VanSalesReport from './VanSalesReport'

export default function AdminVans() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeSection = location.pathname.endsWith('/refills') ? 'refills' : location.pathname.endsWith('/transfers') ? 'transfers' : location.pathname.endsWith('/sales') ? 'sales' : 'fleet'
  const [vans, setVans] = useState([])
  const [attendants, setAttendants] = useState([])
  const [registration, setRegistration] = useState('')
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [refill, setRefill] = useState({ van_id: '', item_id: '', supplier_id: '', quantity: '', empty_quantity: '', unit_cost: '' })
  const [transfer, setTransfer] = useState({ from_van_id: '', to_van_id: '', item_id: '', quantity: '' })
  const [transferRows, setTransferRows] = useState([])
  const [transferPage, setTransferPage] = useState(1)
  const [transferMeta, setTransferMeta] = useState({ pages: 0, total: 0 })
  const [vanStocks, setVanStocks] = useState({})
  const [vanEmpties, setVanEmpties] = useState({})
  const [salesVan, setSalesVan] = useState(() => new URLSearchParams(location.search).get('van_id') || '')
  const [vanSales, setVanSales] = useState([])
  const [movements, setMovements] = useState([])
  const [salesMeta, setSalesMeta] = useState({ page: 1, pages: 0, total: 0 })
  const [movementMeta, setMovementMeta] = useState({ page: 1, pages: 0, total: 0 })
  const [reconciliation, setReconciliation] = useState(null)
  const refresh = async () => {
    const [v, a, t, s] = await Promise.all([api.get('/vans'), api.get('/admin/attendants/all'), api.get(`/vans/transfers?page=${transferPage}&per_page=20`), api.get('/suppliers')])
    setVans(v.data); setAttendants(a.data.filter(x => x.is_verified)); setTransferRows(t.data.items || []); setTransferMeta({ pages: t.data.pages || 0, total: t.data.total || 0 }); setSuppliers(s.data)
    const stocks = await Promise.all(v.data.map(async van => [van.id, (await api.get(`/vans/${van.id}/stock`)).data]))
    const empties = await Promise.all(v.data.map(async van => [van.id, (await api.get(`/vans/${van.id}/empty-cylinders`)).data]))
    setVanStocks(Object.fromEntries(stocks)); setVanEmpties(Object.fromEntries(empties))
  }
  useEffect(() => { refresh().catch(() => {}); api.get('/items').then(r => setItems(r.data.filter(item => item.category_name?.toLowerCase().includes('gas')))).catch(() => {}) }, [])
  const addVan = async (e) => {
    e.preventDefault()
    try { await api.post('/vans', { registration_number: registration }); setRegistration(''); await refresh() }
    catch (err) { alert(err.response?.data?.msg || err.message) }
  }
  const assign = async (van, attendant_id) => {
    try { await api.patch(`/vans/${van.id}/attendant`, { attendant_id: attendant_id || null }); await refresh() }
    catch (err) { alert(err.response?.data?.msg || err.message) }
  }
  const remove = async (van) => {
    if (!window.confirm(`Delete van ${van.registration_number}?`)) return
    try { await api.delete(`/vans/${van.id}`); await refresh() } catch (err) { alert(err.response?.data?.msg || err.message) }
  }
  const loadRefill = async (e) => {
    e.preventDefault()
    try { await api.post(`/vans/${refill.van_id}/refills`, { item_id: refill.item_id, supplier_id: refill.supplier_id, quantity: refill.quantity, empty_quantity: refill.empty_quantity, unit_cost: refill.unit_cost }); alert('Depot refill recorded'); setRefill({ van_id: '', item_id: '', supplier_id: '', quantity: '', empty_quantity: '', unit_cost: '' }); await refresh() }
    catch (err) { alert(err.response?.data?.msg || err.message) }
  }
  const moveStock = async (e) => {
    e.preventDefault()
    try { await api.post('/vans/transfers', transfer); alert('Van transfer completed'); setTransfer({ from_van_id: '', to_van_id: '', item_id: '', quantity: '' }); await refresh() }
    catch (err) { alert(err.response?.data?.msg || err.message) }
  }
  const loadVanHistory = async (vanId, salesPage = 1, movementPage = 1) => {
    try {
      const [r, m, summary] = await Promise.all([api.get(`/sales/van/${vanId}?page=${salesPage}&per_page=20`), api.get(`/vans/${vanId}/movements?page=${movementPage}&per_page=20`), api.get(`/vans/${vanId}/reconciliation`)])
      setVanSales(r.data.sales || []); setSalesMeta({ page: r.data.page || 1, pages: r.data.pages || 0, total: r.data.total || 0 })
      setMovements(m.data.items || []); setMovementMeta({ page: m.data.page || 1, pages: m.data.pages || 0, total: m.data.total || 0 }); setReconciliation(summary.data)
    } catch (err) { alert(err.response?.data?.msg || err.message) }
  }
  const showSales = van => { setSalesVan(String(van.id)); navigate(`/admin/vans/sales?van_id=${van.id}`) }
  const loadTransferPage = async page => {
    try {
      const response = await api.get(`/vans/transfers?page=${page}&per_page=20`)
      setTransferRows(response.data.items || []); setTransferMeta({ pages: response.data.pages || 0, total: response.data.total || 0 }); setTransferPage(response.data.page || page)
    } catch (err) { alert(err.response?.data?.msg || err.message) }
  }
  const soldCylinderCount = reconciliation?.sold_count || 0
  const customerEmptyCount = reconciliation?.customer_empty_count || 0
  const refilledCylinderCount = reconciliation?.refilled_count || 0
  const availableRefillEmpties = (vanEmpties[refill.van_id] || []).find(row => String(row.item_id) === String(refill.item_id))?.quantity || 0
  if (activeSection === 'sales') return <VanSalesReport />
  return <div className="max-w-4xl mx-auto space-y-6">
    {activeSection === 'fleet' && <><header><h1 className="text-2xl font-black">Vans & attendants</h1><p className="mt-1 text-sm text-gray-500">Register vans and assign their attendants. Use the sidebar for depot refills, transfers, and van sales.</p></header><form onSubmit={addVan} className="bg-white dark:bg-gray-800 rounded-2xl p-6 flex flex-col sm:flex-row gap-3">
      <input required value={registration} onChange={e => setRegistration(e.target.value)} placeholder="Van registration number" className="flex-1 p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700" />
      <button className="bg-blue-600 text-white rounded-xl px-6 py-3 font-bold">Add van</button>
    </form>
    <section className="bg-white dark:bg-gray-800 rounded-2xl divide-y dark:divide-gray-700">
      {vans.map(van => <div key={van.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1"><strong>{van.registration_number}</strong><div className="text-xs text-gray-500 mt-1">Attendant: {van.attendant_name || 'Not assigned'}<br/>Filled: {(vanStocks[van.id] || []).map(s => `${s.item_name}: ${s.quantity}`).join(' · ') || 'None'} · Empties awaiting refill: {(vanEmpties[van.id] || []).map(s => `${s.item_name}: ${s.quantity}`).join(' · ') || 'None'}</div></div>
        <select value={van.attendant_id || ''} onChange={e => assign(van, e.target.value)} className="p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700">
          <option value="">No attendant assigned</option>{attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={() => remove(van)} className="text-red-600 font-semibold">Delete</button>
        <button onClick={() => showSales(van)} className="text-blue-600 font-semibold">View sales</button>
      </div>)}
      {!vans.length && <p className="p-8 text-center text-gray-500">No vans registered yet.</p>}
    </section></>}
    {activeSection === 'refills' && <form onSubmit={loadRefill} className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="font-bold text-lg">Load refilled cylinders</h2>
        <select required value={refill.van_id} onChange={e => setRefill({ ...refill, van_id: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"><option value="">Choose van</option>{vans.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select>
        <select required value={refill.item_id} onChange={e => setRefill({ ...refill, item_id: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"><option value="">Cylinder product</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
        <select required value={refill.supplier_id} onChange={e => setRefill({ ...refill, supplier_id: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"><option value="">Choose gas supplier / refiller</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input required type="number" min="1" placeholder="Filled quantity from depot" value={refill.quantity} onChange={e => setRefill({ ...refill, quantity: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"/>
        <div><input type="number" min="0" max={availableRefillEmpties} placeholder="Empty cylinders handed to depot" value={refill.empty_quantity} onChange={e => setRefill({ ...refill, empty_quantity: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"/><p className="mt-1 text-xs text-gray-500">Available on this van: {availableRefillEmpties}</p></div>
        <input type="number" min="0" step="0.01" placeholder="Cost per refill" value={refill.unit_cost} onChange={e => setRefill({ ...refill, unit_cost: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"/>
        <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">Record depot refill</button>
      </form>}
    {activeSection === 'transfers' && <><form onSubmit={moveStock} className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="font-bold text-lg">Transfer filled cylinders between vans</h2>
        <div className="flex gap-3">{['from_van_id','to_van_id'].map((key, i) => <select required key={key} value={transfer[key]} onChange={e => setTransfer({ ...transfer, [key]: e.target.value })} className="w-1/2 p-3 rounded-xl border dark:bg-gray-900"><option value="">{i ? 'To van' : 'From van'}</option>{vans.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select>)}</div>
        <select required value={transfer.item_id} onChange={e => setTransfer({ ...transfer, item_id: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"><option value="">Cylinder product</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
        <input required type="number" min="1" placeholder="Quantity" value={transfer.quantity} onChange={e => setTransfer({ ...transfer, quantity: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"/>
        <button className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold">Complete transfer</button>
      </form><div className="bg-white dark:bg-gray-800 rounded-2xl p-5"><h2 className="font-bold text-lg mb-3">Recent van transfers</h2>{transferRows.length ? transferRows.map(r => <div key={r.id} className="py-2 border-t dark:border-gray-700">{r.quantity} × {r.item_name}: {r.from_van} → {r.to_van} <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleString()}</span></div>) : <p className="text-gray-500">No transfers recorded.</p>}<div className="flex items-center justify-between mt-4 text-sm"><span>{transferMeta.total} transfers · Page {transferPage} of {Math.max(1, transferMeta.pages)}</span><div className="flex gap-2"><button disabled={transferPage <= 1} onClick={() => loadTransferPage(transferPage - 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Previous</button><button disabled={transferPage >= transferMeta.pages} onClick={() => loadTransferPage(transferPage + 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Next</button></div></div></div></>}
  </div>
}
