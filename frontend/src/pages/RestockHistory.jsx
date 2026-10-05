import React, { useState, useEffect, useContext } from 'react';
import api from '../api/api';
import { Truck, Store, Calendar, Package, User, SearchX, ChevronDown, ChevronUp, Trash2, Edit, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';

function MobileRestockCard({ movement, onEdit, onDelete, isAdmin }) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-black text-orange-600 dark:text-orange-400">{movement.item_name}</h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-bold">Qty:</span> +{movement.qty}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-bold">Cost:</span> {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(movement.buy_price || 0)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
            movement.movement_type === 'purchase_in' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800' :
            movement.movement_type === 'transfer_in' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800' :
            'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800'
          }`}>
            {movement.movement_type.replace('_', ' ')}
          </span>
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1">
            {formatDate(movement.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <div className="flex items-center gap-1">
          <User size={14} className="text-gray-400" />
          {movement.user_name}
        </div>
      </div>

      {isAdmin && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
          <button onClick={() => onEdit(movement)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-blue-300 px-3 py-2 text-xs font-bold text-blue-600 dark:border-blue-700 dark:text-blue-400">
            <Edit size={14} /> Edit
          </button>
          <button onClick={() => onDelete(movement.id)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-600 dark:border-red-700 dark:text-red-400">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </article>
  );
}

export default function RestockHistory() {
  const { user } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalHistory, setTotalHistory] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedShops, setExpandedShops] = useState({});
  const [editingMovement, setEditingMovement] = useState(null);
  const [editForm, setEditForm] = useState({ qty: '', buy_price: '' });
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [currentPage]);

  const fetchShops = async () => {
    try {
      const response = await api.get('/shops');
      setShops(response.data);
      // Initialize all shops as expanded
      const initialExpanded = {};
      response.data.forEach(shop => {
        initialExpanded[shop.name] = true;
      });
      setExpandedShops(initialExpanded);
    } catch (err) {
      console.error('Error fetching shops');
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get('/stocks/history', {
        params: { page: currentPage, per_page: 25 }
      });
      const data = response.data;
      if (data.pages > 0 && currentPage > data.pages) {
        setCurrentPage(data.pages);
        return;
      }
      setHistory(data.history);
      setTotalHistory(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      console.error('Error fetching restock history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this restock record? Stock will be reversed.')) return;
    try {
      await api.delete(`/stocks/history/${id}`);
      fetchHistory();
    } catch (err) {
      alert(err.response?.data?.msg || 'Error deleting restock record');
    }
  };

  const handleEdit = (movement) => {
    setEditingMovement(movement);
    setEditForm({
      qty: movement.qty,
      buy_price: movement.buy_price
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/stocks/history/${editingMovement.id}`, editForm);
      setEditingMovement(null);
      fetchHistory();
    } catch (err) {
      alert(err.response?.data?.msg || 'Error updating restock record');
    }
  };

  const toggleShop = (shopName) => {
    setExpandedShops(prev => ({
      ...prev,
      [shopName]: !prev[shopName]
    }));
  };

  // Group history by shop
  const groupedHistory = history.reduce((acc, curr) => {
    if (!acc[curr.shop_name]) acc[curr.shop_name] = [];
    acc[curr.shop_name].push(curr);
    return acc;
  }, {});

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val || 0);
  };

  if (loading) {
    return <div className="flex bg-[#f1f5f9] dark:bg-[#0f172a] min-h-screen items-center justify-center text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest transition-colors">Loading history...</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center gap-3 transition-colors">
        <div className="bg-orange-600 p-3 rounded-2xl text-white shadow-lg shadow-orange-200 dark:shadow-none transition-colors">
          <Truck size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight transition-colors">Restock History</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium transition-colors">Detailed logs of stock replenishments across all shops</p>
        </div>
      </div>

      {Object.keys(groupedHistory).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
          <SearchX size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-sm">No restock records found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedHistory).map(([shopName, movements]) => (
            <div key={shopName} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
              <button 
                onClick={() => toggleShop(shopName)}
                className="w-full flex justify-between items-center p-6 bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all border-b border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <Store size={24} className="text-orange-600 dark:text-orange-400" />
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">{shopName} <span className="ml-2 text-sm text-gray-400 font-medium">({movements.length} on this page)</span></h2>
                </div>
                {expandedShops[shopName] ? <ChevronUp size={24} className="text-gray-400" /> : <ChevronDown size={24} className="text-gray-400" />}
              </button>
              
              {expandedShops[shopName] && (
                <>
                  <div className="md:hidden space-y-3 p-3">
                    {movements.map((m) => (
                      <MobileRestockCard
                        key={m.id}
                        movement={m}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                  <div className="hidden md:block overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse min-w-[800px]">
                      <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">
                        <tr>
                          <th className="px-6 py-4 text-left border-b border-gray-100 dark:border-gray-700">Product</th>
                          <th className="px-6 py-4 text-center border-b border-gray-100 dark:border-gray-700">Quantity</th>
                          <th className="px-6 py-4 text-right border-b border-gray-100 dark:border-gray-700">Cost Price</th>
                          <th className="px-6 py-4 text-left border-b border-gray-100 dark:border-gray-700">Restocked By</th>
                          <th className="px-6 py-4 text-left border-b border-gray-100 dark:border-gray-700">Date & Time</th>
                          <th className="px-6 py-4 text-left border-b border-gray-100 dark:border-gray-700">Type</th>
                          {user?.role === 'admin' && <th className="px-6 py-4 text-right border-b border-gray-100 dark:border-gray-700">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700 transition-colors">
                        {movements.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Package size={16} className="text-blue-500" />
                                <span className="font-bold text-gray-900 dark:text-white">{m.item_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-lg font-black text-sm">
                                +{m.qty}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-600 dark:text-gray-400">
                              {formatCurrency(m.buy_price)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <User size={14} className="text-gray-400" />
                                {m.user_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} />
                                {formatDate(m.created_at)}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                                m.movement_type === 'purchase_in' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800' :
                                m.movement_type === 'transfer_in' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800' :
                                'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800'
                              }`}>
                                {m.movement_type.replace('_', ' ')}
                              </span>
                            </td>
                            {user?.role === 'admin' && (
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => handleEdit(m)}
                                    className="text-blue-500 hover:text-blue-700 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    title="Edit Restock"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(m.id)}
                                    className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Delete Restock"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(currentPage - 1) * 25 + 1}–{Math.min(currentPage * 25, totalHistory)} of {totalHistory}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1 || loading}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700"
            >
              Previous
            </button>
            <span className="self-center text-sm font-bold text-gray-600 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages || loading}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-orange-50/50 dark:bg-orange-900/10">
              <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Edit className="text-orange-600" />
                Edit Restock
              </h3>
              <button onClick={() => setEditingMovement(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Product</label>
                <input 
                  type="text" 
                  value={editingMovement.item_name} 
                  disabled 
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-500 dark:text-gray-400 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Quantity</label>
                  <input 
                    type="number" 
                    value={editForm.qty} 
                    onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })}
                    required
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Buy Price</label>
                  <input 
                    type="number" 
                    value={editForm.buy_price} 
                    onChange={(e) => setEditForm({ ...editForm, buy_price: e.target.value })}
                    required
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingMovement(null)}
                  className="flex-1 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-orange-200 dark:shadow-none transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
