import { useEffect, useState } from 'react'
import api from '../api/api'
import { ArrowLeftRight, Truck } from 'lucide-react'
import SearchableSelect from '../components/SearchableSelect'
import useSubmissionLock from '../hooks/useSubmissionLock'

const fieldClass = 'w-full rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900'

export default function Transfers() {
  const [vans, setVans] = useState([])
  const [items, setItems] = useState([])
  const [fromVan, setFromVan] = useState('')
  const [toVan, setToVan] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [transfers, setTransfers] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [error, setError] = useState('')
  const { isSubmitting, run } = useSubmissionLock()

  const loadTransfers = async (nextPage = page) => {
    const { data } = await api.get(`/vans/transfers?page=${nextPage}&per_page=20`)
    setTransfers(data.items || [])
    setPage(data.page || nextPage)
    setPages(data.pages || 0)
  }

  useEffect(() => {
    Promise.all([api.get('/vans'), api.get('/items')])
      .then(([vansResponse, itemsResponse]) => {
        setVans(vansResponse.data)
        setItems(itemsResponse.data.filter(item => item.category_name?.toLowerCase().includes('gas')))
      })
      .catch(err => setError(err.response?.data?.msg || 'Could not load vans and gas products.'))
    loadTransfers(1).catch(err => setError(err.response?.data?.msg || 'Could not load van transfer history.'))
  }, [])

  const submitTransfer = async event => {
    event.preventDefault()
    if (fromVan === toVan) {
      setError('Choose two different vans.')
      return
    }

    setError('')
    await run(async () => {
      try {
        await api.post('/vans/transfers', {
          from_van_id: fromVan,
          to_van_id: toVan,
          item_id: itemId,
          quantity,
        })
        setItemId('')
        setQuantity('')
        await loadTransfers(1)
      } catch (err) {
        setError(err.response?.data?.msg || err.message || 'Could not complete van transfer.')
      }
    })
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="flex items-center gap-3">
      <div className="rounded-2xl bg-indigo-600 p-3 text-white"><ArrowLeftRight size={26} /></div>
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Van Transfers</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Move filled gas cylinders between vans.</p>
      </div>
    </header>

    <form onSubmit={submitTransfer} className="space-y-5 rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800 sm:p-7">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Truck size={20} className="text-indigo-600" /> Create a van transfer</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold">From van
          <select required value={fromVan} onChange={event => setFromVan(event.target.value)} className={fieldClass}>
            <option value="">Choose source van</option>{vans.map(van => <option key={van.id} value={van.id}>{van.registration_number}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-semibold">To van
          <select required value={toVan} onChange={event => setToVan(event.target.value)} className={fieldClass}>
            <option value="">Choose destination van</option>{vans.filter(van => String(van.id) !== String(fromVan)).map(van => <option key={van.id} value={van.id}>{van.registration_number}</option>)}
          </select>
        </label>
      </div>
      <div className="grid items-end gap-4 sm:grid-cols-[1fr_12rem_auto]">
        <label className="space-y-2 text-sm font-semibold">Gas product
          <SearchableSelect options={items} value={itemId} onChange={event => setItemId(event.target.value)} placeholder="Choose cylinder product" />
        </label>
        <label className="space-y-2 text-sm font-semibold">Quantity
          <input required type="number" min="1" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} className={fieldClass} />
        </label>
        <button disabled={isSubmitting || vans.length < 2 || !items.length} className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
          {isSubmitting ? 'Transferring…' : 'Transfer stock'}
        </button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
      {vans.length < 2 && <p className="text-sm text-amber-700 dark:text-amber-300">Register at least two vans before creating a transfer.</p>}
    </form>

    <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800 sm:p-7">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Van transfer history</h2>
        <span className="text-sm text-gray-500">Page {page} of {Math.max(1, pages)}</span>
      </div>
      {transfers.length ? <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {transfers.map(transfer => <div key={transfer.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <span className="font-semibold">{transfer.quantity} × {transfer.item_name}</span>
          <span>{transfer.from_van} <span className="text-indigo-600">→</span> {transfer.to_van}</span>
          <time className="text-gray-500">{new Date(transfer.created_at).toLocaleString()}</time>
        </div>)}
      </div> : <p className="py-6 text-center text-sm text-gray-500">No van transfers recorded.</p>}
      <div className="mt-3 flex justify-end gap-2">
        <button disabled={page <= 1} onClick={() => loadTransfers(page - 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Previous</button>
        <button disabled={!pages || page >= pages} onClick={() => loadTransfers(page + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Next</button>
      </div>
    </section>
  </div>
}
