import { useEffect, useState } from 'react'
import api from '../api/api'

export default function VanInventory() {
  const [van, setVan] = useState(null)
  const [stock, setStock] = useState([])
  const [empties, setEmpties] = useState([])
  const [transfers, setTransfers] = useState([])
  const [movements, setMovements] = useState([])
  const [transferPage, setTransferPage] = useState(1)
  const [transferPages, setTransferPages] = useState(0)
  const [movementPage, setMovementPage] = useState(1)
  const [movementPages, setMovementPages] = useState(0)
  const [gasItems, setGasItems] = useState([])
  const [collection, setCollection] = useState({ item_id: '', quantity: '', customer_name: '', customer_phone: '' })
  const refresh = async () => {
    const { data } = await api.get('/vans/mine')
    setVan(data)
    const [s, e, t, m] = await Promise.all([api.get(`/vans/${data.id}/stock`), api.get(`/vans/${data.id}/empty-cylinders`), api.get(`/vans/transfers?page=${transferPage}&per_page=20`), api.get(`/vans/${data.id}/movements?page=${movementPage}&per_page=20`)])
    setStock(s.data); setEmpties(e.data); setTransfers(t.data.items || []); setTransferPages(t.data.pages || 0); setMovements(m.data.items || []); setMovementPages(m.data.pages || 0)
  }
  const loadTransferPage = async page => { const { data } = await api.get(`/vans/transfers?page=${page}&per_page=20`); setTransfers(data.items || []); setTransferPages(data.pages || 0); setTransferPage(data.page || page) }
  const loadMovementPage = async page => { const { data } = await api.get(`/vans/${van.id}/movements?page=${page}&per_page=20`); setMovements(data.items || []); setMovementPages(data.pages || 0); setMovementPage(data.page || page) }
  useEffect(() => { refresh().catch(() => {}) }, [])
  useEffect(() => { api.get('/items').then(response => setGasItems(response.data.filter(item => item.category_name?.toLowerCase().includes('gas')))).catch(() => {}) }, [])
  const recordCollection = async event => {
    event.preventDefault()
    try {
      await api.post(`/vans/${van.id}/empty-cylinders/collect`, collection)
      setCollection({ item_id: '', quantity: '', customer_name: '', customer_phone: '' })
      await refresh()
    } catch (error) { alert(error.response?.data?.msg || error.message || 'Unable to record collected cylinders') }
  }
  return <div className="space-y-5">
    <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl"><h1 className="text-2xl font-black">Van inventory · {van?.registration_number || 'Loading'}</h1><p className="mt-1 text-gray-500">Filled cylinder stock assigned to your van.</p></section>
    <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl"><h2 className="font-bold text-lg mb-3">Filled cylinders</h2>{stock.length ? stock.map(row => <div key={row.item_id} className="flex justify-between border-t dark:border-gray-700 py-3"><span>{row.item_name}</span><strong>{row.quantity}</strong></div>) : <p className="text-gray-500">No filled stock loaded.</p>}</section>
    <form onSubmit={recordCollection} className="bg-white dark:bg-gray-800 p-5 rounded-2xl space-y-3"><div><h2 className="font-bold text-lg">Record empty cylinders collected</h2><p className="text-sm text-gray-500 mt-1">Add customer empties to this van before taking them to the depot for refilling.</p></div><div className="grid gap-3 sm:grid-cols-2"><input required value={collection.customer_name} onChange={event => setCollection({ ...collection, customer_name: event.target.value })} placeholder="Customer name" className="w-full min-w-0 rounded-xl border p-3 dark:border-gray-700 dark:bg-gray-900"/><input required type="tel" value={collection.customer_phone} onChange={event => setCollection({ ...collection, customer_phone: event.target.value })} placeholder="Customer phone" className="w-full min-w-0 rounded-xl border p-3 dark:border-gray-700 dark:bg-gray-900"/><select required value={collection.item_id} onChange={event => setCollection({ ...collection, item_id: event.target.value })} className="w-full min-w-0 rounded-xl border p-3 dark:border-gray-700 dark:bg-gray-900"><option value="">Cylinder size</option>{gasItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input required type="number" min="1" step="1" value={collection.quantity} onChange={event => setCollection({ ...collection, quantity: event.target.value })} placeholder="Quantity collected" className="w-full min-w-0 rounded-xl border p-3 dark:border-gray-700 dark:bg-gray-900"/></div><button className="w-full sm:w-auto rounded-xl bg-amber-600 px-5 py-3 font-bold text-white">Record collection</button></form>
    <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl"><h2 className="font-bold text-lg mb-1">Empty cylinders awaiting depot refill</h2><p className="text-sm text-gray-500 mb-3">These are empties collected from customers and still on this van.</p>{empties.length ? empties.map(row => <div key={row.item_id} className="flex justify-between gap-3 border-t dark:border-gray-700 py-3"><span>{row.item_name}</span><strong>{row.quantity}</strong></div>) : <p className="text-gray-500">No customer empties are currently awaiting refill.</p>}</section>
    <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl"><h2 className="font-bold text-lg mb-3">Van transfers</h2>{transfers.length ? transfers.map(row => <div key={row.id} className="border-t dark:border-gray-700 py-3">{row.quantity} × {row.item_name}: {row.from_van} → {row.to_van} · {new Date(row.created_at).toLocaleString()}</div>) : <p className="text-gray-500">No transfers recorded.</p>}<div className="flex justify-between items-center mt-3 text-sm"><span>Page {transferPage} of {Math.max(1, transferPages)}</span><div className="flex gap-2"><button disabled={transferPage <= 1} onClick={() => loadTransferPage(transferPage - 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Previous</button><button disabled={transferPage >= transferPages} onClick={() => loadTransferPage(transferPage + 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Next</button></div></div></section>
    <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl"><h2 className="font-bold text-lg mb-3">Stock movement history</h2>{movements.length ? movements.map(row => <div key={row.id} className="border-t dark:border-gray-700 py-3 flex flex-wrap justify-between gap-2"><span>{row.movement_type.replace('_', ' ')} · {row.item_name}</span><strong>{row.quantity > 0 ? '+' : ''}{row.quantity}</strong><span className="text-gray-500">{row.reference} · {new Date(row.created_at).toLocaleString()}</span></div>) : <p className="text-gray-500">No stock movements recorded.</p>}<div className="flex justify-between items-center mt-3 text-sm"><span>Page {movementPage} of {Math.max(1, movementPages)}</span><div className="flex gap-2"><button disabled={movementPage <= 1} onClick={() => loadMovementPage(movementPage - 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Previous</button><button disabled={movementPage >= movementPages} onClick={() => loadMovementPage(movementPage + 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Next</button></div></div></section>
  </div>
}
