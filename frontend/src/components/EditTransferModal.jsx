import React, { useState, useEffect } from "react";
import api from "../api/api";
import { X, Plus, Trash2, ArrowLeftRight, Save, Store } from "lucide-react";
import SearchableSelect from "./SearchableSelect";

export default function EditTransferModal({ transfer, onClose, onUpdate }) {
  const [apiItems, setApiItems] = useState([]);
  const [shops, setShops] = useState([]);
  const [fromShopId, setFromShopId] = useState(transfer.from_shop_id || "");
  const [toShopId, setToShopId] = useState(transfer.to_shop_id || "");
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState(transfer.notes || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
    if (transfer && transfer.items) {
      setItems(transfer.items.map(item => ({
        item_id: item.item_id,
        name: item.item_name,
        qty: item.qty
      })));
    }
  }, [transfer]);

  const fetchInitialData = async () => {
    try {
      const [itemsRes, shopsRes] = await Promise.all([
        api.get("/items"),
        api.get("/shops")
      ]);
      setApiItems(itemsRes.data);
      setShops(shopsRes.data);
    } catch (err) {
      console.error("Error fetching initial data", err);
    }
  };

  const handleAddItem = () => {
    const itemToAdd = apiItems.find((i) => i.id === parseInt(selectedItem));
    if (!itemToAdd || !quantity) {
      alert("Please select item and quantity.");
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    const existingItemIndex = items.findIndex((i) => i.item_id === itemToAdd.id);

    if (existingItemIndex > -1) {
      setItems(items.map((item, index) =>
        index === existingItemIndex ? { ...item, qty: item.qty + qty } : item
      ));
    } else {
      setItems([...items, {
        item_id: itemToAdd.id,
        name: itemToAdd.name,
        qty: qty
      }]);
    }
    setQuantity("");
    setSelectedItem("");
  };

  const handleRemoveItem = (indexToRemove) => {
    setItems(items.filter((_, index) => index !== indexToRemove));
  };

  const handleUpdate = async () => {
    if (!fromShopId || !toShopId || fromShopId === toShopId) {
      alert("Please select valid and different source and destination shops.");
      return;
    }
    if (items.length === 0) {
      alert("Transfer items cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      await api.put(`/transfers/${transfer.id}`, {
        from_shop_id: fromShopId,
        to_shop_id: toShopId,
        items: items.map(({ item_id, qty }) => ({ item_id, qty })),
        notes: notes
      });
      alert("Transfer updated successfully!");
      onUpdate();
      onClose();
    } catch (err) {
      alert(`Error updating transfer: ${err.response?.data?.msg || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 transition-colors flex flex-col max-h-[90vh]">
        <div className="bg-blue-600 p-4 sm:p-6 text-white flex justify-between items-center gap-3 shrink-0">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <ArrowLeftRight size={24} /> Edit Stock Transfer #{transfer.id}
            </h3>
            <p className="text-blue-100 text-sm mt-1 font-medium italic">Update inventory relocation details</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>

        <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* SHOPS SELECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">From Shop (Source)</label>
                  <select
                    className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                    value={fromShopId}
                    onChange={(e) => setFromShopId(e.target.value)}
                  >
                    <option value="">Select Shop...</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">To Shop (Destination)</label>
                  <select
                    className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                    value={toShopId}
                    onChange={(e) => setToShopId(e.target.value)}
                  >
                    <option value="">Select Shop...</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* ITEM SELECTION */}
              <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-black text-gray-400 uppercase mb-4 tracking-widest">Add / Modify Items</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Select Item</label>
                    <SearchableSelect
                      options={apiItems}
                      value={selectedItem}
                      onChange={(e) => setSelectedItem(e.target.value)}
                      placeholder="Choose Product..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Qty</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="flex-1 p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                      <button
                        onClick={handleAddItem}
                        className="bg-blue-600 text-white py-2 px-6 rounded-lg font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-2 whitespace-nowrap"
                      >
                        <Plus size={16} /> ADD
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ITEMS TABLE */}
              <div className="border dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900 transition-colors">
                    <tr>
                      <th className="px-4 py-3 text-left font-black text-gray-400 uppercase text-[10px]">Item Name</th>
                      <th className="px-4 py-3 text-center font-black text-gray-400 uppercase text-[10px]">Qty</th>
                      <th className="px-4 py-3 text-center font-black text-gray-400 uppercase text-[10px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 transition-colors font-medium">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors text-gray-700 dark:text-gray-300">
                        <td className="px-4 py-3 font-bold">{item.name}</td>
                        <td className="px-4 py-3 text-center font-black">{item.qty}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-gray-400 italic font-bold uppercase tracking-widest">No items in transfer</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SIDE PANEL */}
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <h4 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase mb-4 tracking-widest">Transfer Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Transfer Notes</label>
                    <textarea
                      className="w-full p-3 text-sm border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[100px]"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any specific instructions or reasons..."
                    />
                  </div>
                  <div className="pt-4 border-t border-blue-100 dark:border-blue-900/50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                      <Store size={14} /> Source: <span className="text-blue-600 dark:text-blue-400">{shops.find(s => s.id == fromShopId)?.name || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                      <Store size={14} /> Destination: <span className="text-blue-600 dark:text-blue-400">{shops.find(s => s.id == toShopId)?.name || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleUpdate}
                  disabled={loading || items.length === 0}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={20} /> {loading ? "SAVING..." : "SAVE CHANGES"}
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  CANCEL
                </button>
              </div>
              <p className="text-[10px] text-gray-400 font-medium text-center italic leading-relaxed">
                Caution: Modifying a transfer will revert previous stock levels and apply new relocations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
