import React, { useState, useEffect, useContext } from 'react'
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/api'
import api from '../api/api'
import Card from '../components/Card'
import { Plus, Edit, Trash2, Phone, Mail, MapPin, User, FileText, Package, X, Search, CalendarX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SearchContext } from '../context/SearchContext'

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    item_ids: []
  })
  const { searchQuery, searchType } = useContext(SearchContext)

  useEffect(() => {
    loadSuppliers()
    loadItems()
  }, [])

  const loadSuppliers = async () => {
    try {
      const res = await fetchSuppliers()
      setSuppliers(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadItems = async () => {
    try {
      const res = await api.get('/items/')
      setItems(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const filteredSuppliers = searchQuery
    ? suppliers.filter(s => {
        if (searchType === 'date' && s.created_at) {
          return s.created_at.startsWith(searchQuery)
        }
        const searchLower = searchQuery.toLowerCase()
        return (
          s.name.toLowerCase().includes(searchLower) ||
          (s.contact_person && s.contact_person.toLowerCase().includes(searchLower)) ||
          (s.phone && s.phone.toLowerCase().includes(searchLower)) ||
          (s.email && s.email.toLowerCase().includes(searchLower)) ||
          (s.address && s.address.toLowerCase().includes(searchLower))
        )
      })
    : suppliers

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData)
      } else {
        await createSupplier(formData)
      }
      setShowModal(false)
      setEditingSupplier(null)
      setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', item_ids: [] })
      loadSuppliers()
    } catch (err) {
      alert(err.response?.data?.msg || "Error saving supplier")
    }
  }

  const handleEdit = (s) => {
    setEditingSupplier(s)
    setFormData({
      name: s.name,
      contact_person: s.contact_person || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      item_ids: s.supplied_products?.map(p => p.id) || []
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return
    try {
      await deleteSupplier(id)
      loadSuppliers()
    } catch (err) {
      alert("Error deleting supplier")
    }
  }

  const toggleProduct = (itemId) => {
    const current = [...formData.item_ids]
    if (current.includes(itemId)) {
      setFormData({ ...formData, item_ids: current.filter(id => id !== itemId) })
    } else {
      setFormData({ ...formData, item_ids: [...current, itemId] })
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
            <h2 className="text-xl font-semibold">Manage Product Suppliers</h2>
            {searchQuery && (
                <div className="flex items-center gap-2 mt-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full w-fit">
                    <Search size={14} />
                    {searchType === 'date' ? `Suppliers from: ${searchQuery}` : `Searching for: "${searchQuery}"`}
                </div>
            )}
        </div>
        <div className="flex gap-2">
            <Link 
                to="/admin/supplier-invoices" 
                className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors shadow-sm"
            >
                <FileText size={20} />
                Invoices
            </Link>
            <button 
                onClick={() => { setEditingSupplier(null); setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', item_ids: [] }); setShowModal(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
            >
                <Plus size={20} />
                Add Supplier
            </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map(s => (
            <Card key={s.id} className="relative group overflow-hidden border-t-4 border-blue-500">
              <div className="p-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{s.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-gray-400" />
                    <span>{s.contact_person || 'No contact person'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-gray-400" />
                    <span>{s.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-gray-400" />
                    <span className="truncate">{s.email || 'No email'}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-gray-400 mt-1" />
                    <span className="line-clamp-2">{s.address || 'No address'}</span>
                  </div>
                </div>

                <div className="border-t pt-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                        <Package size={14} /> Supplied Products ({s.supplied_products?.length || 0})
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {s.supplied_products && s.supplied_products.length > 0 ? (
                            s.supplied_products.map(p => (
                                <span key={p.id} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">
                                    {p.name}
                                </span>
                            ))
                        ) : (
                            <span className="text-xs italic text-gray-400">No products associated</span>
                        )}
                    </div>
                </div>
              </div>
            </Card>
          ))}
          {filteredSuppliers.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <CalendarX size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">{searchQuery ? 'No matching suppliers found' : 'No suppliers found'}</p>
                {searchQuery && <p className="text-xs text-gray-400 mt-2">Try another {searchType === 'date' ? 'date' : 'search term'} or clear search</p>}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-blue-600 p-6 text-white shrink-0">
              <h3 className="text-xl font-bold">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <p className="text-blue-100 text-sm mt-1">Fill in the details and associate products</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-1">General Info</h4>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier Name *</label>
                        <input 
                        required
                        type="text" 
                        className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. Gas Suppliers Ltd"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Person</label>
                        <input 
                        type="text" 
                        className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        value={formData.contact_person}
                        onChange={e => setFormData({...formData, contact_person: e.target.value})}
                        placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                        <input 
                            type="text" 
                            className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            placeholder="+254..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                        <input 
                            type="email" 
                            className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            placeholder="supplier@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                        <textarea 
                        className="w-full border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        rows="2"
                        placeholder="Physical address..."
                        ></textarea>
                    </div>
                  </div>

                  <div className="space-y-4 flex flex-col h-full">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Products Supplied</h4>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex-1 overflow-y-auto max-h-[300px]">
                        {items.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No products registered in the catalog yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {items.map(item => (
                                    <label key={item.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${formData.item_ids.includes(item.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
                                        <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={formData.item_ids.includes(item.id)}
                                            onChange={() => toggleProduct(item.id)}
                                        />
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.item_ids.includes(item.id) ? 'bg-white border-white' : 'bg-gray-100 border-gray-300'}`}>
                                            {formData.item_ids.includes(item.id) && <div className="w-2 h-2 bg-blue-600 rounded-sm" />}
                                        </div>
                                        <span className="text-xs font-bold truncate">{item.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="text-[10px] text-gray-400">Selected {formData.item_ids.length} products</div>
                  </div>
              </div>

              <div className="flex gap-3 pt-2 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                >
                  {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
