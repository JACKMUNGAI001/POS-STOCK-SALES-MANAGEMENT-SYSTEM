import React, { useState, useEffect } from "react";
import api from "../api/api";
import { X, Plus, Trash2, ShoppingCart, CreditCard, Save } from "lucide-react";
import SearchableSelect from "./SearchableSelect";

export default function EditSaleModal({ sale, onClose, onUpdate }) {
  const [apiItems, setApiItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentType, setPaymentType] = useState(sale.payment_type || "mobile_money");
  const [saleType, setSaleType] = useState(sale.sale_type || "standard");
  const [customerName, setCustomerName] = useState(sale.customer_name || "");
  const [customerPhone, setCustomerPhone] = useState(sale.customer_phone || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
    // Initialize cart items from existing sale items
    if (sale && sale.items) {
      setCartItems(sale.items.map(item => ({
        item_id: item.item_id,
        name: item.item_name,
        qty: item.qty,
        unit_price: item.unit_price
      })));
    }
  }, [sale]);

  const fetchItems = async () => {
    try {
      const response = await api.get("/items");
      setApiItems(response.data);
    } catch (err) {
      console.error("Error fetching items");
    }
  };

  const handleAddItem = () => {
    const itemToAdd = apiItems.find((i) => i.id === parseInt(selectedItem));
    if (!itemToAdd || !quantity || !unitPrice) {
      alert("Please select item, quantity and enter price.");
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    const price = parseFloat(unitPrice);
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price.");
      return;
    }

    const existingCartItemIndex = cartItems.findIndex((i) => i.item_id === itemToAdd.id && i.unit_price === price);

    if (existingCartItemIndex > -1) {
      setCartItems(cartItems.map((item, index) =>
        index === existingCartItemIndex ? { ...item, qty: item.qty + qty } : item
      ));
    } else {
      setCartItems([...cartItems, {
        item_id: itemToAdd.id,
        name: itemToAdd.name,
        qty: qty,
        unit_price: price,
      }]);
    }
    setQuantity("");
    setUnitPrice("");
    setSelectedItem("");
  };

  const handleRemoveFromCart = (indexToRemove) => {
    setCartItems(cartItems.filter((_, index) => index !== indexToRemove));
  };

  const handleUpdate = async () => {
    if (cartItems.length === 0) {
      alert("Cart cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      await api.put(`/sales/${sale.id}`, {
        items: cartItems.map(({ item_id, qty, unit_price }) => ({ item_id, qty, unit_price })),
        payment_type: paymentType,
      sale_type: saleType,
      saleType: saleType,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      });
      alert("Sale updated successfully!");
      onUpdate();
      onClose();
    } catch (err) {
      alert(`Error updating sale: ${err.response?.data?.msg || err.message}`);
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
              <ShoppingCart size={24} /> Edit Sale Record #{sale.id}
            </h3>
            <p className="text-blue-100 text-sm mt-1 font-medium">Branch: {sale.shop_name} | Attendant: {sale.attendant_name}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>

        <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-black text-gray-400 uppercase mb-4 tracking-widest">Add / Modify Items</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <input
                      type="number"
                      className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Price</label>
                    <input
                      type="number"
                      className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      placeholder="KES"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddItem}
                  className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> ADD TO LIST
                </button>
              </div>

              <div className="border dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900 transition-colors">
                    <tr>
                      <th className="px-4 py-3 text-left font-black text-gray-400 uppercase text-[10px]">Item</th>
                      <th className="px-4 py-3 text-center font-black text-gray-400 uppercase text-[10px]">Qty</th>
                      <th className="px-4 py-3 text-right font-black text-gray-400 uppercase text-[10px]">Price</th>
                      <th className="px-4 py-3 text-center font-black text-gray-400 uppercase text-[10px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 transition-colors font-medium">
                    {cartItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors text-gray-700 dark:text-gray-300">
                        <td className="px-4 py-3 font-bold">{item.name}</td>
                        <td className="px-4 py-3 text-center">{item.qty}</td>
                        <td className="px-4 py-3 text-right">{item.unit_price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleRemoveFromCart(index)} className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {cartItems.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-gray-400 italic">No items in sale</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <h4 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase mb-4 tracking-widest">Order Summary</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Payment Method</label>
                    <select
                      className="w-full p-2 text-sm border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                    >
                      <option value="mobile_money">Mobile Money (M-PESA)</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Sale Type</label>
                    <select
                      className="w-full p-2 text-sm border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                      value={saleType}
                      onChange={(e) => setSaleType(e.target.value)}
                    >
                      <option value="standard">Regular Sale</option>
                      <option value="credit">BAADAYE ( SOLD ON CREDIT)</option>
                    </select>
                  </div>
                  {saleType === "credit" && (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Customer Name</label>
                        <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full p-2 text-sm border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Contact Tel No.</label>
                        <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full p-2 text-sm border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                      </div>
                    </>
                  )}
                  <div className="pt-4 border-t border-blue-100 dark:border-blue-900/50">
                    <div className="text-[10px] font-black text-blue-400 uppercase mb-1">New Total Amount</div>
                    <div className="text-2xl font-black text-blue-700 dark:text-blue-400">
                      KES {cartItems.reduce((sum, item) => sum + (item.qty * item.unit_price), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleUpdate}
                  disabled={loading || cartItems.length === 0}
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
              <p className="text-[10px] text-gray-400 font-medium text-center italic">
                Note: Updating a sale will automatically revert old stock and deduct new stock levels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
