import { useEffect, useState } from 'react'
import api from '../api/api'

export default function AdminVans() {
  const [vans, setVans] = useState([])
  const [attendants, setAttendants] = useState([])
  const [registration, setRegistration] = useState('')
  const [items, setItems] = useState([])
  const [refill, setRefill] = useState({ van_id: '', item_id: '', quantity: '', empty_quantity: '', unit_cost: '' })
  const [transfer, setTransfer] = useState({ from_van_id: '', to_van_id: '', item_id: '', quantity: '' })
  const [transferRows, setTransferRows] = useState([])
  const [vanStocks, setVanStocks] = useState({})
  const [vanEmpties, setVanEmpties] = useState({})
  const [salesVan, setSalesVan] = useState('')
  const [vanSales, setVanSales] = useState([])
  const [movements, setMovements] = useState([])
  const refresh = async () => {
    const [v, a, t] = await Promise.all([api.get('/vans'), api.get('/admin/attendants/all'), api.get('/vans/transfers')])
    setVans(v.data); setAttendants(a.data.filter(x => x.is_verified)); setTransferRows(t.data)
    const stocks = await Promise.all(v.data.map(async van => [van.id, (await api.get(`/vans/${van.id}/stock`)).data]))
    const empties = await Promise.all(v.data.map(async van => [van.id, (await api.get(`/vans/${van.id}/empty-cylinders`)).data]))
    setVanStocks(Object.fromEntries(stocks)); setVanEmpties(Object.fromEntries(empties))
  }
  useEffect(() => { refresh().catch(() => {}); api.get('/items').then(r => setItems(r.data)).catch(() => {}) }, [])
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
    try { await api.post(`/vans/${refill.van_id}/refills`, { item_id: refill.item_id, quantity: refill.quantity, empty_quantity: refill.empty_quantity, unit_cost: refill.unit_cost }); alert('Depot refill recorded'); setRefill({ van_id: '', item_id: '', quantity: '', empty_quantity: '', unit_cost: '' }); await refresh() }
    catch (err) { alert(err.response?.data?.msg || err.message) }
  }
  const moveStock = async (e) => {
    e.preventDefault()
    try { await api.post('/vans/transfers', transfer); alert('Van transfer completed'); setTransfer({ from_van_id: '', to_van_id: '', item_id: '', quantity: '' }); await refresh() }
    catch (err) { alert(err.response?.data?.msg || err.message) }
  }
  const showSales = async (van) => {
    setSalesVan(String(van.id))
    try { const [r, m] = await Promise.all([api.get(`/sales/van/${van.id}`), api.get(`/vans/${van.id}/movements`)]); setVanSales(r.data.sales || r.data); setMovements(m.data) }
    catch (err) { alert(err.response?.data?.msg || err.message) }
  }
  return <div className="max-w-4xl mx-auto space-y-6">
    <form onSubmit={addVan} className="bg-white dark:bg-gray-800 rounded-2xl p-6 flex flex-col sm:flex-row gap-3">
      <input required value={registration} onChange={e => setRegistration(e.target.value)} placeholder="Van registration number" className="flex-1 p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700" />
      <button className="bg-blue-600 text-white rounded-xl px-6 py-3 font-bold">Add van</button>
    </form>
    <section className="bg-white dark:bg-gray-800 rounded-2xl divide-y dark:divide-gray-700">
      {vans.map(van => <div key={van.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1"><strong>{van.registration_number}</strong><div className="text-xs text-gray-500 mt-1">Filled: {(vanStocks[van.id] || []).map(s => `${s.item_name}: ${s.quantity}`).join(' · ') || 'None'}<br/>Empties: {(vanEmpties[van.id] || []).map(s => `${s.item_name}: ${s.quantity}`).join(' · ') || 'None'}</div></div>
        <select value={van.attendant_id || ''} onChange={e => assign(van, e.target.value)} className="p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-700">
          <option value="">No attendant assigned</option>{attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={() => remove(van)} className="text-red-600 font-semibold">Delete</button>
        <button onClick={() => showSales(van)} className="text-blue-600 font-semibold">Sales</button>
      </div>)}
      {!vans.length && <p className="p-8 text-center text-gray-500">No vans registered yet.</p>}
    </section>
    {salesVan && <><section className="bg-white dark:bg-gray-800 rounded-2xl p-5"><h2 className="font-bold text-lg mb-3">Van sales · {vans.find(v => String(v.id) === salesVan)?.registration_number}</h2>{vanSales.length ? vanSales.map(s => <div key={s.id} className="border-t dark:border-gray-700 py-3 flex flex-wrap gap-x-4"><span>Sale #{s.id}</span><span>{s.customer_name || 'Buyer not named'}</span><span>{s.items?.map(i => `${i.item_name} ×${i.qty}`).join(', ')}</span><span>KES {s.total_amount}</span><span>{s.sale_type === 'credit' ? `Credit · ${s.status}` : 'Paid'}</span><span>{new Date(s.created_at).toLocaleString()}</span></div>) : <p className="text-gray-500">No recorded sales for this van.</p>}</section>
      <section className="bg-white dark:bg-gray-800 rounded-2xl p-5"><h2 className="font-bold text-lg mb-3">Stock movement history</h2>{movements.length ? movements.map(m => <div key={m.id} className="border-t dark:border-gray-700 py-2 flex flex-wrap gap-x-4"><span>{m.movement_type.replace('_', ' ')}</span><span>{m.item_name}</span><span className={m.quantity < 0 ? 'text-red-600' : 'text-green-700'}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span><span>{m.reference}</span><span>{new Date(m.created_at).toLocaleString()}</span></div>) : <p className="text-gray-500">No stock movements yet.</p>}</section></>}
    <div className="grid lg:grid-cols-2 gap-5">
      <form onSubmit={loadRefill} className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="font-bold text-lg">Load refilled cylinders</h2>
        <select required value={refill.van_id} onChange={e => setRefill({ ...refill, van_id: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"><option value="">Choose van</option>{vans.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select>
        <select required value={refill.item_id} onChange={e => setRefill({ ...refill, item_id: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"><option value="">Cylinder product</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
        <input required type="number" min="1" placeholder="Filled quantity from depot" value={refill.quantity} onChange={e => setRefill({ ...refill, quantity: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"/>
        <input type="number" min="0" placeholder="Empty cylinders handed to depot" value={refill.empty_quantity} onChange={e => setRefill({ ...refill, empty_quantity: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"/>
        <input type="number" min="0" step="0.01" placeholder="Cost per refill" value={refill.unit_cost} onChange={e => setRefill({ ...refill, unit_cost: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"/>
        <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">Record depot refill</button>
      </form>
      <form onSubmit={moveStock} className="bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="font-bold text-lg">Transfer filled cylinders between vans</h2>
        <div className="flex gap-3">{['from_van_id','to_van_id'].map((key, i) => <select required key={key} value={transfer[key]} onChange={e => setTransfer({ ...transfer, [key]: e.target.value })} className="w-1/2 p-3 rounded-xl border dark:bg-gray-900"><option value="">{i ? 'To van' : 'From van'}</option>{vans.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select>)}</div>
        <select required value={transfer.item_id} onChange={e => setTransfer({ ...transfer, item_id: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"><option value="">Cylinder product</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
        <input required type="number" min="1" placeholder="Quantity" value={transfer.quantity} onChange={e => setTransfer({ ...transfer, quantity: e.target.value })} className="w-full p-3 rounded-xl border dark:bg-gray-900"/>
        <button className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold">Complete transfer</button>
      </form>
    </div>
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5"><h2 className="font-bold text-lg mb-3">Recent van transfers</h2>{transferRows.length ? transferRows.map(r => <div key={r.id} className="py-2 border-t dark:border-gray-700">{r.quantity} × {r.item_name}: {r.from_van} → {r.to_van} <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleString()}</span></div>) : <p className="text-gray-500">No transfers recorded.</p>}</div>
  </div>
}
