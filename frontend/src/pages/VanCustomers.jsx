import { useEffect, useMemo, useState } from 'react'
import api from '../api/api'

const currency = value => new Intl.NumberFormat('en-KE', {
  style: 'currency', currency: 'KES', maximumFractionDigits: 2,
}).format(Number(value || 0))

export default function VanCustomers() {
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [listPage, setListPage] = useState(1)
  const [listMeta, setListMeta] = useState({ pages: 0, total: 0 })

  const loadCustomers = async (page = listPage) => {
    try {
      const response = await api.get(`/customers?page=${page}&per_page=20&q=${encodeURIComponent(search.trim())}`)
      setCustomers(response.data.items || [])
      setListPage(response.data.page || page)
      setListMeta({ pages: response.data.pages || 0, total: response.data.total || 0 })
      setError('')
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to load customer records')
    }
  }

  useEffect(() => { loadCustomers(1) }, [search])

  const openCustomer = async (customer, page = 1) => {
    try {
      const response = await api.get(`/customers/${customer.id}?page=${page}&per_page=20`)
      setSelected(response.data)
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to load customer history')
    }
  }

  const filteredCustomers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return customers
    return customers.filter(customer => `${customer.name} ${customer.phone}`.toLowerCase().includes(needle))
  }, [customers, search])

  return <div className="space-y-6">
    <section className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Van customers</h2>
          <p className="text-sm text-gray-500 mt-1">Repeat van buyers, their purchase history, and outstanding credit.</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone" className="p-3 border rounded-xl dark:bg-gray-900 dark:border-gray-700" />
      </div>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-gray-500 border-b dark:border-gray-700"><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Van purchases</th><th className="p-3">Purchase total</th><th className="p-3">Credit owed</th><th className="p-3">Last purchase</th></tr></thead>
          <tbody>
            {filteredCustomers.map(customer => <tr key={customer.id} onClick={() => openCustomer(customer)} className="border-b dark:border-gray-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700/50">
              <td className="p-3 font-bold text-blue-700 dark:text-blue-300">{customer.name}</td><td className="p-3">{customer.phone}</td><td className="p-3">{customer.sale_count}</td><td className="p-3">{currency(customer.total_sales)}</td><td className="p-3 font-semibold">{currency(customer.outstanding_balance)}</td><td className="p-3">{customer.last_purchase_at ? new Date(customer.last_purchase_at).toLocaleDateString() : '—'}</td>
            </tr>)}
            {!filteredCustomers.length && <tr><td colSpan="6" className="p-8 text-center text-gray-500">No van customer records found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-gray-500">{listMeta.total} customers · Page {listPage} of {Math.max(1, listMeta.pages)}</span>
        <div className="flex gap-2"><button disabled={listPage <= 1} onClick={() => loadCustomers(listPage - 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Previous</button><button disabled={listPage >= listMeta.pages} onClick={() => loadCustomers(listPage + 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Next</button></div>
      </div>
    </section>

    {selected && <section className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-4">
        <div><h2 className="text-xl font-black">{selected.name}</h2><p className="text-gray-500">{selected.phone}</p></div>
        <div className="sm:text-right"><p>{selected.sale_count} van sales · Total {currency(selected.total_sales)}</p><p className="font-bold">Credit owed: {currency(selected.outstanding_balance)}</p></div>
      </div>
      <h3 className="font-bold mb-2">Van sale history</h3>
      {selected.sales.length ? selected.sales.map(sale => <article key={sale.id} className="border-t dark:border-gray-700 py-3 space-y-1">
        <div className="flex flex-wrap gap-x-4 font-semibold"><span>Sale #{sale.id}</span><span>{sale.van_registration || sale.shop_name}</span><span>{sale.sale_type === 'credit' ? `Credit · ${sale.status} · Owes ${currency(Math.max(0, sale.total_amount - sale.paid_amount))}` : `Regular · ${sale.payment_type || 'Paid'}`}</span><span>{currency(sale.total_amount)}</span><span>{new Date(sale.created_at).toLocaleString()}</span></div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{sale.items.map(item => `${item.item_name}: ${item.qty} × ${currency(item.unit_price)}; ${item.returned_empty_qty || 0} empty returned`).join(' · ')}</p>
      </article>) : <p className="text-gray-500">No recorded van purchases.</p>}
      <div className="flex items-center justify-between mt-4 text-sm"><span className="text-gray-500">Page {selected.page} of {Math.max(1, selected.pages)}</span><div className="flex gap-2"><button disabled={selected.page <= 1} onClick={() => openCustomer(selected, selected.page - 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Previous</button><button disabled={selected.page >= selected.pages} onClick={() => openCustomer(selected, selected.page + 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Next</button></div></div>
    </section>}
  </div>
}
