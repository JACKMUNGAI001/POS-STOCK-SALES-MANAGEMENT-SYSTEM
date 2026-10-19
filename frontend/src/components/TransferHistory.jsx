import React, { useState, useEffect, useContext } from 'react';
import api from '../api/api';
import { ArrowLeftRight, Clock, SearchX, User, Edit2, Trash2 } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { SearchContext } from '../context/SearchContext';
import EditTransferModal from './EditTransferModal';

export default function TransferHistory() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const { searchQuery } = useContext(SearchContext);

  const fetchTransfers = async () => {
    try {
      const response = await api.get('/transfers');
      setTransfers(response.data);
    } catch (err) {
      console.error('Error fetching transfers:', err);
      setError("Failed to load transfer history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transfer? This will revert all stock movements.")) return;
    try {
      await api.delete(`/transfers/${id}`);
      alert("Transfer deleted successfully");
      fetchTransfers();
    } catch (err) {
      alert(`Error deleting transfer: ${err.response?.data?.msg || err.message}`);
    }
  };

  const filteredTransfers = searchQuery
    ? transfers.filter(t => 
        t.from_shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.to_shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.items?.some(it => it.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : transfers;

  return (
    <div className="mt-2 min-h-[calc(100dvh-7rem)] sm:mt-10 sm:min-h-0">
      <div className="flex min-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800 sm:block sm:min-h-0">
        <div className="w-full flex justify-between items-center p-6 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <ArrowLeftRight size={20} className="sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            <div className="text-left">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white tracking-tight">Stock Transfer History</h2>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">Record of all inventory relocations</p>
            </div>
          </div>
          {!loading && !error && (
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              {filteredTransfers.length} Records
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 sm:block">
          {loading ? (
              <div className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">
                Loading transfers...
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/30 p-10 text-center text-red-600 dark:text-red-400 font-bold">
                {error}
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="p-10 text-center text-gray-400 transition-colors">
                {searchQuery ? (
                  <>
                    <SearchX size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No transfers match your search</p>
                  </>
                ) : (
                  "No inter-shop transfers recorded yet."
                )}
              </div>
            ) : (
              <>
              <div className="space-y-3 p-3 md:hidden">
                {filteredTransfers.map(t => <article key={t.id} className="rounded-xl border border-gray-100 p-4 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold break-words">{t.from_shop_name} <span className="text-blue-600">→ {t.to_shop_name}</span></p><p className="mt-1 text-xs text-gray-500">{formatDate(t.created_at)} · {t.status}</p></div><div className="flex shrink-0 gap-1"><button onClick={() => setEditingTransfer(t)} className="rounded-lg p-2 text-blue-600" aria-label="Edit transfer"><Edit2 size={16}/></button><button onClick={() => handleDelete(t.id)} className="rounded-lg p-2 text-red-600" aria-label="Delete transfer"><Trash2 size={16}/></button></div></div>
                  <div className="mt-3 flex flex-wrap gap-1">{t.items?.map((it, idx) => <span key={idx} className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold dark:bg-gray-700">{it.item_name} × {it.qty}</span>)}</div>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 break-words">{t.notes || 'No notes provided'}</p><p className="mt-1 text-xs text-gray-500">{t.created_by_name}</p>
                </article>)}
              </div>
              <div className="hidden h-full max-h-none overflow-x-auto overflow-y-auto custom-scrollbar sm:h-auto sm:max-h-96 md:block">
                <table className="min-w-[800px] md:min-w-full relative border-collapse">
                  <thead className="bg-gray-50/90 dark:bg-gray-900/90 sticky top-0 z-10 backdrop-blur-sm transition-colors">
                    <tr className="transition-colors">
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">Movement</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">Items</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">Status/Date</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">Notes</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700 bg-white dark:bg-gray-800 transition-colors text-sm">
                    {filteredTransfers.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From:</span>
                              <span className="font-bold text-gray-900 dark:text-white">{t.from_shop_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To:</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">{t.to_shop_name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {t.items?.map((it, idx) => (
                              <span key={idx} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-tight">
                                {it.item_name} (x{it.qty})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                              {t.status}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                              <Clock size={10} /> {formatDate(t.created_at)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-500 dark:text-gray-400 italic max-w-xs truncate" title={t.notes}>
                            {t.notes || "No notes provided"}
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-1">
                              <User size={10} /> {t.created_by_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => setEditingTransfer(t)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Edit Transfer"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Delete Transfer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
          )}
        </div>
      </div>

      {editingTransfer && (
        <EditTransferModal
          transfer={editingTransfer}
          onClose={() => setEditingTransfer(null)}
          onUpdate={fetchTransfers}
        />
      )}
    </div>
  );
}
