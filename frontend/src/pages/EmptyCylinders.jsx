import { useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/api'
import { RefreshCw, Cylinder, Plus, Edit, Trash2, Save, X, ChevronDown, ChevronUp, Store, Truck } from 'lucide-react'
import { AuthContext } from '../context/AuthContext'
import SearchableSelect from '../components/SearchableSelect'

function MobileCylinderCard({ row, buyPrice, onBuyPriceChange, onRefill, quantities, setQuantities, isAdmin, onEdit, onDelete }) {
  const key = `${row.shop_id}-${row.item_id}`
  const qty = Number(quantities[key] || 0)
  const canRefill = row.empty_qty > 0 && qty > 0 && qty <= row.empty_qty

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-black text-amber-600 dark:text-amber-400">{row.item_name}</h3>
          <p className="mt-0.5 text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <span className="inline-flex items-center gap-1 text-xs"><span className="font-bold">Shop:</span> {row.shop_name}</span>
          </p>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            Empties: {row.empty_qty}
          </span>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Filled: {row.filled_qty}</p>
        </div>
      </div>

      {row.empty_qty > 0 && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Qty to Refill</label>
              <input
                className="w-full rounded border p-2 text-center text-sm font-bold"
                type="number"
                min="1"
                max={row.empty_qty}
                value={quantities[key] || ''}
                onChange={e => setQuantities({ ...quantities, [key]: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Buy Price / kg</label>
              <input
                className="w-full rounded border p-2 text-center text-sm font-bold"
                type="number"
                min="0"
                step="0.01"
                placeholder="KES"
                value={buyPrice || ''}
                onChange={e => onBuyPriceChange(key, e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={() => onRefill(row)}
            disabled={!canRefill}
            className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <RefreshCw size={14} /> Refill
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
          <button onClick={() => onEdit(row)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-600 dark:border-amber-700 dark:text-amber-400">
            <Edit size={14} /> Edit
          </button>
          <button onClick={() => onDelete(row)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-600 dark:border-red-700 dark:text-red-400">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </article>
  )
}

export default function EmptyCylinders() {
  const { user } = useContext(AuthContext)
  const [rows, setRows] = useState([]); const [vanRows, setVanRows] = useState([]); const [loading, setLoading] = useState(true); const [quantities, setQuantities] = useState({}); const [error, setError] = useState('')
  const [items, setItems] = useState([]); const [shops, setShops] = useState([]); const [form, setForm] = useState({ shop_id: user?.shop_id || '', item_id: '', qty: '', note: '' })
  const [buyPrices, setBuyPrices] = useState({})
  const [editingRow, setEditingRow] = useState(null)
  const [editQty, setEditQty] = useState('')
  const [expandedShops, setExpandedShops] = useState({})
  const gasItems = useMemo(() => items.filter(item => item.category_name?.toLowerCase().includes('gas')), [items])
  const load = async () => { setLoading(true); setError(''); try { const r = await api.get('/stocks/empty-cylinders'); setRows(r.data); if (user?.role === 'admin') { const vans = await api.get('/vans'); const allVanRows = await Promise.all(vans.data.map(async van => { const response = await api.get(`/vans/${van.id}/empty-cylinders`); return response.data.map(row => ({ ...row, van_id: van.id, registration_number: van.registration_number })) })); setVanRows(allVanRows.flat()) } } catch (e) { setError(e.response?.data?.msg || 'Unable to load empty cylinders. Please refresh the page.') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  useEffect(() => { (async () => { try { const [itemsResponse, shopsResponse] = await Promise.all([api.get('/items'), api.get('/shops')]); setItems(itemsResponse.data); setShops(shopsResponse.data); if (!form.shop_id && shopsResponse.data.length) setForm(current => ({ ...current, shop_id: shopsResponse.data[0].id })) } catch { setError('Unable to load gas products and shops.') } })() }, [])
  const refill = async (row) => { const qty = Number(quantities[`${row.shop_id}-${row.item_id}`] || 0); const buyPrice = buyPrices[`${row.shop_id}-${row.item_id}`]; if (!qty || qty > row.empty_qty) return alert('Enter a quantity within the available empty cylinders.'); try { await api.post('/stocks/empty-cylinders/refill', { shop_id: row.shop_id, item_id: row.item_id, qty, buy_price: buyPrice || undefined }); setQuantities(current => { const next = { ...current }; delete next[`${row.shop_id}-${row.item_id}`]; return next }); setBuyPrices(current => { const next = { ...current }; delete next[`${row.shop_id}-${row.item_id}`]; return next }); await load() } catch (e) { alert(e.response?.data?.msg || 'Unable to refill cylinders') } }
  const addEmpties = async (e) => { e.preventDefault(); const qty = Number(form.qty); if (!form.shop_id || !form.item_id || !Number.isInteger(qty) || qty <= 0) return alert('Choose a shop and gas cylinder, then enter a whole positive quantity.'); try { await api.post('/stocks/empty-cylinders/add', { ...form, qty }); setForm(current => ({ ...current, item_id: '', qty: '', note: '' })); await load() } catch (e) { alert(e.response?.data?.msg || 'Unable to add empty cylinders') } }
  const handleBuyPriceChange = (key, value) => { setBuyPrices(current => ({ ...current, [key]: value })) }
  const handleEdit = (row) => { setEditingRow(row); setEditQty(String(row.empty_qty)) }
  const handleUpdate = async () => { if (!editingRow) return; const qty = Number(editQty); if (!Number.isInteger(qty) || qty < 0) return alert('Enter a whole number quantity.'); try { await api.put(`/stocks/empty-cylinders/${editingRow.shop_id}/${editingRow.item_id}`, { qty }); setEditingRow(null); await load() } catch (e) { alert(e.response?.data?.msg || 'Unable to update empty cylinders') } }
  const handleDelete = async (row) => { if (!window.confirm(`Delete empty cylinder record for ${row.item_name} at ${row.shop_name}? This cannot be undone.`)) return; try { await api.delete(`/stocks/empty-cylinders/${row.shop_id}/${row.item_id}`); await load() } catch (e) { alert(e.response?.data?.msg || 'Unable to delete empty cylinder record') } }
  const isAdmin = user?.role === 'admin'
  const sizeSummary = useMemo(() => {
    const map = new Map()
    const regex = /(\d+(?:\.\d+)?)\s*kg/i
    rows.forEach(row => {
      const match = row.item_name.match(regex)
      const size = match ? `${match[1]}kg` : 'Other'
      map.set(size, (map.get(size) || 0) + (row.empty_qty || 0))
    })
    return Array.from(map.entries()).sort((a, b) => {
      const numA = parseFloat(a[0])
      const numB = parseFloat(b[0])
      if (!isNaN(numA) && !isNaN(numB)) return numB - numA
      return a[0].localeCompare(b[0])
    })
  }, [rows])
  const groupedRows = useMemo(() => {
    const groups = rows.reduce((acc, row) => {
      const shopName = row.shop_name || 'Unknown Shop'
      if (!acc[shopName]) acc[shopName] = []
      acc[shopName].push(row)
      return acc
    }, {})
    Object.keys(groups).forEach(shopName => {
      if (!expandedShops[shopName]) {
        expandedShops[shopName] = true
      }
    })
    return groups
  }, [rows, expandedShops])
  const toggleShop = (shopName) => {
    setExpandedShops(prev => ({ ...prev, [shopName]: !prev[shopName] }))
  }
  return <div>
    <div className="mb-6 flex items-center gap-3"><Cylinder className="text-amber-600" size={30}/><div><h1 className="text-2xl font-black">Empty Cylinders</h1><p className="text-sm text-gray-500">Shop balances and van empties awaiting depot refill are tracked separately.</p></div></div>
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Total Empties:</span>
      {sizeSummary.map(([size, total]) => (
        <span key={size} className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          {size} = {total}
        </span>
      ))}
    </div>
    <form onSubmit={addEmpties} className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h2 className="mb-4 flex items-center gap-2 font-black"><Plus size={18} className="text-amber-600"/> Add shop empty cylinders</h2><div className="grid gap-3 md:grid-cols-4">{user?.role !== 'attendant' && <SearchableSelect options={shops} value={form.shop_id} onChange={e=>setForm({...form,shop_id:e.target.value})} placeholder="Choose shop..."/>}<SearchableSelect options={gasItems} value={form.item_id} onChange={e=>setForm({...form,item_id:e.target.value})} placeholder="Choose gas cylinder..."/><input className="rounded border p-3" type="number" min="1" step="1" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} placeholder="Quantity"/><input className="rounded border p-3" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Optional note"/></div><button className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white">Add shop empties</button></form>
    <div className="space-y-6">
      {loading ? <div className="p-10 text-center text-gray-400">Loading empty cylinders...</div> : error ? <div className="p-10 text-center text-red-600">{error}</div> : Object.keys(groupedRows).length === 0 ? <div className="p-10 text-center text-gray-400">No empty-cylinder records yet. Use the form above to enter each shop's current balance.</div> : Object.entries(groupedRows).map(([shopName, shopRows]) => (
        <div key={shopName} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <button 
            onClick={() => toggleShop(shopName)}
            className="w-full flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border-b border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <Store size={22} className="text-amber-600 dark:text-amber-400" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">{shopName} <span className="ml-2 text-sm text-gray-400 font-medium">({shopRows.length} Records)</span></h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Total:</span>
                {Array.from(shopRows.reduce((map, row) => { const regex = /(\d+(?:\.\d+)?)\s*kg/i; const match = row.item_name.match(regex); const size = match ? `${match[1]}kg` : 'Other'; map.set(size, (map.get(size) || 0) + (row.empty_qty || 0)); return map }, new Map()).entries()).sort((a, b) => { const numA = parseFloat(a[0]); const numB = parseFloat(b[0]); if (!isNaN(numA) && !isNaN(numB)) return numB - numA; return a[0].localeCompare(b[0]) }).map(([size, total]) => (
                  <span key={size} className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {size} = {total}
                  </span>
                ))}
              </div>
            </div>
            {expandedShops[shopName] ? <ChevronUp size={22} className="text-gray-400" /> : <ChevronDown size={22} className="text-gray-400" />}
          </button>
          
          {expandedShops[shopName] && (
            <>
              <div className="md:hidden space-y-3 p-3">
                {shopRows.map(row => {
                  const key = `${row.shop_id}-${row.item_id}`
                  return (
                    <MobileCylinderCard
                      key={key}
                      row={row}
                      buyPrice={buyPrices[key]}
                      onBuyPriceChange={handleBuyPriceChange}
                      onRefill={refill}
                      quantities={quantities}
                      setQuantities={setQuantities}
                      isAdmin={isAdmin}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  )
                })}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[650px]">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="p-4 text-left text-xs uppercase text-gray-500">Cylinder</th>
                      <th className="p-4 text-center text-xs uppercase text-gray-500">Empties</th>
                      <th className="p-4 text-center text-xs uppercase text-gray-500">Filled Stock</th>
                      <th className="p-4 text-center text-xs uppercase text-gray-500">Refill</th>
                      {isAdmin && <th className="p-4 text-center text-xs uppercase text-gray-500">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {shopRows.map(row => {
                      const key = `${row.shop_id}-${row.item_id}`
                      return (
                        <tr key={key} className="border-t dark:border-gray-700">
                          <td className="p-4 font-semibold">{row.item_name}</td>
                          <td className="p-4 text-center font-black text-amber-600">{row.empty_qty}</td>
                          <td className="p-4 text-center font-bold">{row.filled_qty}</td>
                          <td className="p-4">
                            {row.empty_qty > 0 && (
                              <div className="flex flex-col items-center gap-2">
                                <div className="flex justify-center gap-2">
                                  <input className="w-20 rounded border p-2 text-center" type="number" min="1" max={row.empty_qty} value={quantities[key] || ''} onChange={e => setQuantities({ ...quantities, [key]: e.target.value })} />
                                  <button onClick={() => refill(row)} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white"><RefreshCw size={14} /> Refill</button>
                                </div>
                                <input
                                  className="w-32 rounded border p-2 text-center text-xs"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Buy price / kg"
                                  value={buyPrices[key] || ''}
                                  onChange={e => handleBuyPriceChange(key, e.target.value)}
                                />
                              </div>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => handleEdit(row)} className="rounded-lg border border-amber-300 p-2 text-amber-600 dark:border-amber-700 dark:text-amber-400" title="Edit"><Edit size={16} /></button>
                                <button onClick={() => handleDelete(row)} className="rounded-lg border border-red-300 p-2 text-red-600 dark:border-red-700 dark:text-red-400" title="Delete"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ))}
    </div>

    {user?.role === 'admin' && <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="border-b border-blue-100 bg-blue-50 p-4 dark:border-gray-700 dark:bg-blue-900/20"><h2 className="flex items-center gap-2 font-black"><Truck size={20} className="text-blue-600"/> Van empties awaiting depot refill</h2><p className="mt-1 text-sm text-gray-500">Customer empties collected and currently held by each van.</p></div>{vanRows.length ? <div className="divide-y dark:divide-gray-700">{vanRows.map(row => <div key={`${row.van_id}-${row.item_id}`} className="flex flex-wrap items-center justify-between gap-2 p-4"><div><strong>{row.registration_number}</strong><p className="text-sm text-gray-500">{row.item_name}</p></div><span className="rounded-lg bg-amber-50 px-3 py-1 font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{row.quantity} empty</span></div>)}</div> : <p className="p-5 text-sm text-gray-500">No van empties are currently awaiting refill.</p>}</section>}

    {editingRow && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-amber-600 p-6 text-white flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2"><Cylinder size={24} /> Edit Empty Cylinders</h3>
              <p className="text-amber-100 text-sm mt-1 font-medium">{editingRow.item_name} — {editingRow.shop_name}</p>
            </div>
            <button onClick={() => setEditingRow(null)} className="text-white/80 hover:text-white transition-colors"><X size={28} /></button>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Empty Quantity</label>
              <input
                type="number"
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-black text-lg"
                value={editQty}
                onChange={e => setEditQty(e.target.value)}
                min="0"
              />
              <p className="mt-1 text-[10px] text-gray-400 italic font-medium">Current: {editingRow?.empty_qty} units</p>
            </div>
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
              <button
                onClick={handleUpdate}
                className="w-full bg-amber-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-100 dark:shadow-none hover:bg-amber-700 transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} /> Update Quantity
              </button>
              <button
                onClick={() => setEditingRow(null)}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
}
