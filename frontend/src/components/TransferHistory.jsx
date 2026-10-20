import { useContext, useEffect, useState } from 'react'
import api from '../api/api'
import { ArrowLeftRight, SearchX, Truck } from 'lucide-react'
import { formatDate } from '../utils/helpers'
import { SearchContext } from '../context/SearchContext'

export default function TransferHistory() {
  const [transfers, setTransfers] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { searchQuery } = useContext(SearchContext)

  const loadTransfers = async (nextPage = page) => {
    setLoading(true)
    try {
      const { data } = await api.get(`/vans/transfers?page=${nextPage}&per_page=20`)
      setTransfers(data.items || [])
      setPage(data.page || nextPage)
      setPages(data.pages || 0)
      setTotal(data.total || 0)
      setError('')
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load van transfer history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTransfers(1) }, [])

  const query = searchQuery.trim().toLowerCase()
  const filteredTransfers = query ? transfers.filter(transfer =>
    [transfer.from_van, transfer.to_van, transfer.item_name].some(value => value?.toLowerCase().includes(query))
  ) : transfers

  return <div className="mt-2 min-h-[calc(100dvh-7rem)] sm:mt-10 sm:min-h-0">
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <header className="flex items-center justify-between gap-4 border-b border-gray-100 bg-indigo-50 p-5 dark:border-gray-700 dark:bg-indigo-900/20 sm:p-6">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="text-indigo-600 dark:text-indigo-400" size={24} />
          <div><h1 className="text-lg font-bold text-gray-900 dark:text-white">Van Transfer History</h1><p className="text-xs text-gray-500 dark:text-gray-400">Stock movements between vans</p></div>
        </div>
        {!loading && !error && <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">{total} records</span>}
      </header>

      {loading ? <p className="p-10 text-center text-sm text-gray-500">Loading van transfers…</p> : error ?
        <p role="alert" className="bg-red-50 p-8 text-center text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p> :
        filteredTransfers.length ? <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {filteredTransfers.map(transfer => <article key={transfer.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3"><Truck size={18} className="mt-0.5 shrink-0 text-indigo-500" /><div>
              <p className="font-bold text-gray-900 dark:text-white">{transfer.from_van} <span className="text-indigo-600 dark:text-indigo-400">→</span> {transfer.to_van}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{transfer.quantity} × {transfer.item_name}</p>
            </div></div>
            <time className="text-xs text-gray-500">{formatDate(transfer.created_at)}</time>
          </article>)}
        </div> : <div className="p-10 text-center text-gray-500">{query ? <><SearchX className="mx-auto mb-3 opacity-40" /><p>No van transfers match your search.</p></> : <p>No van transfers recorded yet.</p>}</div>}

      {!loading && !error && <footer className="flex items-center justify-between border-t border-gray-100 p-4 text-sm dark:border-gray-700">
        <span>Page {page} of {Math.max(1, pages)}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => loadTransfers(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
          <button disabled={!pages || page >= pages} onClick={() => loadTransfers(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
        </div>
      </footer>}
    </section>
  </div>
}
