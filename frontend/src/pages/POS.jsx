import { useState, useEffect, useContext } from "react";
import api, { API_BASE } from "../api/api";
import { AuthContext } from "../context/AuthContext";
import { ShoppingCart, Plus, Trash2, CreditCard, Store } from "lucide-react";
import SearchableSelect from "../components/SearchableSelect";
import useSubmissionLock from "../hooks/useSubmissionLock";
import MobileCartItem from "../components/MobileCartItem";

export default function POS() {
  const { user } = useContext(AuthContext);
  const [apiItems, setApiItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentType, setPaymentType] = useState("mobile_money");
  const [saleType, setSaleType] = useState("standard");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [receiptUuid, setReceiptUuid] = useState(null);
  const [shops, setShops] = useState([]);
  const [vans, setVans] = useState([]);
  const [operation, setOperation] = useState(user?.role === 'attendant' ? 'van' : 'shop');
  const [selectedVan, setSelectedVan] = useState('');
  const [vanStock, setVanStock] = useState([]);
  const [selectedShop, setSelectedShop] = useState(user?.shop_id || "");
  const { isSubmitting: isCompletingSale, run: runSale } = useSubmissionLock();

  useEffect(() => {
    if (user?.role === 'attendant') setOperation('van');
    const fetchItems = async () => {
      try {
        const response = await api.get("/items");
        setApiItems(response.data);
      } catch (err) {
        console.error("Error fetching items");
      }
    };
    fetchItems();

    if (user?.role === 'manager' || user?.role === 'admin') {
      const fetchShops = async () => {
        try {
          const response = await api.get("/shops");
          setShops(response.data);
          if (!selectedShop && response.data.length > 0) {
            setSelectedShop(response.data[0].id);
          }
        } catch (err) {
          console.error("Error fetching shops");
        }
      };
      fetchShops();
      api.get('/vans').then(res => setVans(res.data)).catch(() => {});
    } else if (user?.role === 'attendant') {
      api.get('/vans/mine').then(res => { setVans([res.data]); setSelectedVan(String(res.data.id)); }).catch(() => {
        setOperation('shop');
      });
    }
  }, [user]);

  useEffect(() => {
    if (operation !== 'van' || !selectedVan) { setVanStock([]); return; }
    api.get(`/vans/${selectedVan}/stock`).then(res => setVanStock(res.data)).catch(() => setVanStock([]));
  }, [operation, selectedVan]);

  const selectableItems = operation === 'van'
    ? apiItems.filter(item => vanStock.some(stock => stock.item_id === item.id && stock.quantity > 0))
    : apiItems;

  const handleAddItem = () => {
    const itemToAdd = selectableItems.find((i) => i.id === parseInt(selectedItem));
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
        tracksEmptyCylinder: itemToAdd.category_name?.toLowerCase().includes('gas'),
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

  const handleSale = async () => {
    if (cartItems.length === 0) {
      alert("Cart is empty.");
      return;
    }
    if (operation === 'shop' && !selectedShop) {
      alert("Please select a shop.");
      return;
    }
    if (operation === 'van' && !selectedVan) { alert('No van is selected or assigned.'); return; }
    if (operation === 'van' && (!customerName.trim() || !customerPhone.trim())) {
      alert('Enter the van customer’s name and phone so repeat purchases can be kept on their customer record.');
      return;
    }
    await runSale(async () => {
      try {
      const response = await api.post("/sales", {
        ...(operation === 'van' ? { van_id: selectedVan } : { shop_id: selectedShop }),
        items: cartItems.map(({ item_id, qty, unit_price }) => ({ item_id, qty, unit_price })),
        payment_type: paymentType,
        sale_type: saleType,
        saleType: saleType,
        customer_name: customerName,
        customer_phone: customerPhone,
      });
      setReceiptUuid(response.data.receipt_uuid);
      // Show server response for debugging sale_type
      alert("Sale recorded successfully!");
      setCartItems([]);
      setCustomerName("");
      setCustomerPhone("");
      if (operation === 'van') api.get(`/vans/${selectedVan}/stock`).then(res => setVanStock(res.data)).catch(() => {});
      } catch (err) {
        alert(`Error recording sale: ${err.response?.data?.msg || err.message}`);
      }
    });
  };

  return (
    <>
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
          {/* SELECT ITEMS */}
          <div className="flex-1 space-y-6">
            {(user?.role === 'manager' || user?.role === 'admin') && (
              <div className="bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <Store size={24} className="text-purple-600 dark:text-purple-400" />
                  Sales operation
                </h2>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">Operation</label>
                <select value={operation} onChange={e => { setOperation(e.target.value); setCartItems([]); }} className="w-full p-3 mb-4 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-700"><option value="shop">Shop sale</option>{user?.role === 'admin' && <option value="van">Van sale</option>}</select>
                {operation === 'van' ? <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">Van</label>
                  <select value={selectedVan} onChange={e => { setSelectedVan(e.target.value); setCartItems([]); }} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-700"><option value="">Choose van</option>{vans.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}</select>
                </div> :
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">Acting For Shop</label>
                  <SearchableSelect
                    options={shops}
                    value={selectedShop}
                    onChange={(e) => { setSelectedShop(e.target.value); setCartItems([]); }}
                    placeholder="Choose Shop..."
                  />
                </div>}
              </div>
            )}
            {user?.role === 'attendant' && operation === 'van' && <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl font-semibold text-blue-800 dark:text-blue-300">Van sale · {vans[0]?.registration_number || 'Loading assigned van'}</div>}
            <div className="bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <Plus size={24} className="text-blue-600 dark:text-blue-400" />
                Add Items to Cart
              </h2>
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">Buyer name</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Buyer name" required={operation === 'van' || saleType === 'credit'} className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                  {(operation === 'van' || saleType === 'credit') && <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder={operation === 'van' ? 'Buyer phone (used to find repeat customer)' : 'Buyer phone (required for credit)'} required className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">Select Item</label>
                  <SearchableSelect
                    options={selectableItems}
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    placeholder="Choose Product..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">Quantity</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">Unit Price</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="KES"
                  />
                </div>
              </div>
              <button
                onClick={handleAddItem}
                className="mt-6 w-full sm:w-auto bg-blue-600 text-white py-3 px-8 rounded-xl font-bold shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Add to Cart
              </button>
            </div>

            {/* CART DISPLAY */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
              <div className="bg-gray-50 dark:bg-gray-900/50 px-4 sm:px-8 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center transition-colors">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">Current Cart</span>
                  <span className="sm:hidden">Cart</span>
                </h2>
                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {cartItems.length} Items
                </span>
              </div>
              <div className="max-h-80 custom-scrollbar">
                {cartItems.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 dark:text-gray-500 italic">Your cart is empty</div>
                ) : (
                  <>
                    <div className="md:hidden space-y-3 p-3">
                      {cartItems.map((item, index) => (
                        <MobileCartItem
                          key={index}
                          item={item}
                          index={index}
                          cartItems={cartItems}
                          setCartItems={setCartItems}
                          onRemove={handleRemoveFromCart}
                          operation={operation}
                        />
                      ))}
                    </div>
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full relative border-collapse min-w-[500px]">
                        <thead className="bg-gray-50/90 dark:bg-gray-900/90 sticky top-0 z-10 backdrop-blur-sm transition-colors">
                          <tr>
                            <th className="px-4 sm:px-8 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">Item</th>
                            <th className="px-4 sm:px-8 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">Qty</th>
                            <th className="px-4 sm:px-8 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">Unit Price</th>
                            <th className="px-4 sm:px-8 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">Total</th>
                            <th className="px-4 sm:px-8 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">Cylinder Exchange</th>
                            <th className="px-4 sm:px-8 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                          {cartItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                              <td className="px-4 sm:px-8 py-4 font-bold text-gray-900 dark:text-white text-sm sm:text-base">{item.name}</td>
                              <td className="px-4 sm:px-8 py-4 text-center text-gray-600 dark:text-gray-400 font-medium">{item.qty}</td>
                              <td className="px-4 sm:px-8 py-4 text-right font-medium text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                                KES {item.unit_price.toLocaleString()}
                              </td>
                              <td className="px-4 sm:px-8 py-4 text-right font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-base">
                                KES {(item.qty * item.unit_price).toLocaleString()}
                              </td>
                              <td className="px-4 sm:px-8 py-4 text-center">
                                {item.tracksEmptyCylinder ? <span className="text-xs text-gray-600 dark:text-gray-300">{operation === 'van' ? 'Collect in Van Inventory' : `${item.qty} empty exchanged`}</span> : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="px-4 sm:px-8 py-4 text-center">
                                <button onClick={() => handleRemoveFromCart(index)} className="text-red-400 hover:text-red-600 transition-colors">
                                  <Trash2 size={18} />
                                </button>
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
          </div>

          {/* CHECKOUT SIDEBAR */}
          <div className="w-full lg:w-80">
            <div className="bg-white dark:bg-gray-800 p-5 sm:p-8 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 sticky top-24 transition-colors">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <CreditCard size={24} className="text-blue-600 dark:text-blue-400" />
                Checkout
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">Payment Method</label>
                  <select value={paymentType} onChange={e => setPaymentType(e.target.value)} disabled={saleType === 'credit'} className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold"><option value="mobile_money">Mobile Money (M-PESA)</option><option value="cash">Cash on delivery</option></select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">Sale Type</label>
                  <select value={saleType} onChange={e => { setSaleType(e.target.value); if (e.target.value === 'credit') setPaymentType('credit'); else if (paymentType === 'credit') setPaymentType('mobile_money'); }} className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-bold"><option value="standard">Paid on delivery</option><option value="credit">Credit · pay later</option></select>
                </div>
                
                <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-2 text-gray-500 dark:text-gray-400 font-medium uppercase text-[10px] tracking-widest">Subtotal</div>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                      KES {cartItems.reduce((sum, item) => sum + (item.qty * item.unit_price), 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSale}
                  disabled={cartItems.length === 0 || isCompletingSale}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isCompletingSale ? "Completing Sale..." : "Complete Sale"}
                </button>

                {receiptUuid && (
                  <div className="pt-4 text-center">
                    <a
                      href={`${API_BASE}/receipts/${receiptUuid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block w-full border-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 py-3 rounded-xl font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      View Receipt
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
  );
}
