import { useEffect, useState } from 'react'
import api from '../api/api'

export default function VanInventory() {
  const [van, setVan] = useState(null)
  const [stock, setStock] = useState([])
  const [empties, setEmpties] = useState([])
  const [transfers, setTransfers] = useState([])
  const [movements, setMovements] = useState([])
  const refresh = async () => {
    const { data } = await api.get('/vans/mine')
    setVan(data)
    const [s, e, t, m] = await Promise.all([api.get(`/vans/${data.id}/stock`), api.get(`/vans/${data.id}/empty-cylinders`), api.get('/vans/transfers'), api.get(`/vans/${data.id}/movements`)])
    setStock(s.data); setEmpties(e.data); setTransfers(t.data); setMovements(m.data)
  }
  useEffect(() => { refresh().catch(() => {}) }, [])
  return <div className="space-y-5">
    <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl"><h1 className="text-2xl font-black">Van inventory · {van?.registration_number || 'Loading'}</h1><p className="mt-1 text-gray-500">Filled cylinder stock assigned to your van.</p></section>
    <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl"><h2 className="font-bold text-lg mb-3">Filled cylinders</h2>{stock.length ? stock.map(row => <div key={row.item_id} className="flex justify-between border-t dark:border-gray-700 py-3"><span>{row.item_name}</span><strong>{row.quantity}</strong></div>) : <p className="text-gray-500">No filled stock loaded.</p>}</section>
    <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl"><h2 className="font-bold text-lg mb-3">Customer empties collected</h2>{empties.length ? empties.map(row => <div key={row.item_id} className="flex justify-between border-t dark:border-gray-700 py-3"><span>{row.item_name}</span><strong>{row.quantity}</strong></div>) : <p className="text-gray-500">No empty cylinders recorded.</p>}</section>
    <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl"><h2 className="font-bold text-lg mb-3">Van transfers</h2>{transfers.length ? transfers.map(row => <div key={row.id} className="border-t dark:border-gray-700 py-3">{row.quantity} × {row.item_name}: {row.from_van} → {row.to_van} · {new Date(row.created_at).toLocaleString()}</div>) : <p className="text-gray-500">No transfers recorded.</p>}</section>
    <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl"><h2 className="font-bold text-lg mb-3">Stock movement history</h2>{movements.length ? movements.map(row => <div key={row.id} className="border-t dark:border-gray-700 py-3 flex flex-wrap justify-between gap-2"><span>{row.movement_type.replace('_', ' ')} · {row.item_name}</span><strong>{row.quantity > 0 ? '+' : ''}{row.quantity}</strong><span className="text-gray-500">{row.reference} · {new Date(row.created_at).toLocaleString()}</span></div>) : <p className="text-gray-500">No stock movements recorded.</p>}</section>
  </div>
}
