import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/api';
import Card from '../components/Card';
import { AuthContext } from '../context/AuthContext';
import { SearchContext } from '../context/SearchContext';
import { Store, Plus, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Package, SearchX, Edit, X, Save } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import useSubmissionLock from '../hooks/useSubmissionLock';

export default function ShopDetails() {
  const { shopId } = useParams();
  const { user } = useContext(AuthContext);
  const { searchQuery, searchType } = useContext(SearchContext);
  const [shop, setShop] = useState(null);
  const [shopSales, setShopSales] = useState([]);
  const [shopStock, setShopStock] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [stockFormData, setStockFormData] = useState({
    itemId: "", quantity: "", buyPrice: "", priceUnit: "unit",
  });
  const [itemsToRestock, setItemsToRestock] = useState([]);
  const [editingStock, setEditingStock] = useState(null);
  const [editFormData, setEditFormData] = useState({ qty: "", buy_price: "" });

  const [expandedSection, setExpandedSection] = useState('stock');
  const [expandedStockItems, setExpandedStockItems] = useState([]);
  const [salesSummary, setSalesSummary] = useState(null);
  const [canRestock, setCanRestock] = useState(false);
  const { isSubmitting: isRestocking, run: runRestock } = useSubmissionLock();
  const canManageRestock = user?.role === 'admin' || (user?.role === 'manager' && canRestock);

  const toggleStockItemExpansion = (itemId) => {
    setExpandedStockItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };
  const [pnlSummary, setPnlSummary] = useState({
    today: null,
    week: null,
    month: null,
    year: null,
  });
  const lowStockItems = shopStock.filter(s => s.qty <= 2);

  useEffect(() => {
    fetchShopDetails();
    fetchShopSales();
    fetchShopStock();
    fetchAvailableItems();
    fetchShopSummaries();
  }, [shopId]);

  useEffect(() => {
    if (user?.role !== 'manager') return;
    api.get('/admin/my-restock-permission')
      .then(response => setCanRestock(response.data.can_restock))
      .catch(() => setCanRestock(false));
  }, [user?.role]);

  const fetchShopSummaries = async () => {
    try {
      // Fetch sales summary for the shop
      const salesRes = await api.get(`/reports/sales-summary?shop_id=${shopId}`);
      setSalesSummary(salesRes.data);

      if (user?.role !== 'admin') return;

      // Fetch PNL for different periods (administrator only)
      const [todayPnl, weekPnl, monthPnl, yearPnl] = await Promise.all([
        api.get(`/reports/pnl?shop_id=${shopId}&period=today`),
        api.get(`/reports/pnl?shop_id=${shopId}&period=this_week`),
        api.get(`/reports/pnl?shop_id=${shopId}&month=${new Date().getMonth() + 1}`),
        api.get(`/reports/pnl?shop_id=${shopId}&year=${new Date().getFullYear()}`),
      ]);

      setPnlSummary({
        today: todayPnl.data,
        week: weekPnl.data,
        month: monthPnl.data,
        year: yearPnl.data,
      });
    } catch (err) {
      console.error('Error fetching shop summaries:', err);
    }
  };

  const fetchShopDetails = async () => {
    try {
      const response = await api.get(`/shops/${shopId}`);
      setShop(response.data);
    } catch (err) {
      console.error('Error fetching shop details');
    }
  };

  const fetchShopSales = async () => {
    try {
      const response = await api.get(`/sales/shop/${shopId}`);
      setShopSales(response.data);
    } catch (err) {
      console.error('Error fetching shop sales');
    }
  };

  const fetchShopStock = async () => {
    try {
      const response = await api.get(`/stocks/${shopId}`);
      setShopStock(response.data);
    } catch (err) {
      console.error('Error fetching shop stock');
    }
  };

  const fetchAvailableItems = async () => {
    try {
      const response = await api.get("/items");
      setAvailableItems(response.data);
    } catch (err) {
      console.error("Error fetching available items");
    }
  };

  const isGasLikeItem = (item) => {
    const text = `${item?.name || ''} ${item?.category_name || ''}`.toLowerCase();
    return text.includes('gas') || text.includes('kg');
  };

  const handleStockInputChange = (e) => {
    const { name, value } = e.target;
    setStockFormData({ ...stockFormData, [name]: value });
  };

  const addItemToRestockList = () => {
    if (!stockFormData.itemId) {
      alert("Please select a product.");
      return;
    }
    if (parseInt(stockFormData.quantity) <= 0 || !stockFormData.quantity) {
      alert("Please enter a valid quantity.");
      return;
    }
    
    const selectedItem = availableItems.find(i => i.id === parseInt(stockFormData.itemId));
    const quantity = parseInt(stockFormData.quantity);
    const buyPrice = stockFormData.buyPrice ? parseFloat(stockFormData.buyPrice) : null;
    const priceUnit = stockFormData.priceUnit || "unit";

    // Check if item already exists in the restock list
    const existingIndex = itemsToRestock.findIndex(item => item.itemId === stockFormData.itemId);
    
    if (existingIndex !== -1) {
      const updatedList = [...itemsToRestock];
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        quantity: updatedList[existingIndex].quantity + quantity,
        buyPrice: buyPrice !== null ? buyPrice : updatedList[existingIndex].buyPrice,
        priceUnit: priceUnit || updatedList[existingIndex].priceUnit || "unit"
      };
      setItemsToRestock(updatedList);
    } else {
      const newItem = {
        itemId: stockFormData.itemId,
        itemName: selectedItem?.name,
        quantity: quantity,
        buyPrice: buyPrice,
        priceUnit: priceUnit,
      };
      setItemsToRestock([...itemsToRestock, newItem]);
    }
    
    setStockFormData({ itemId: "", quantity: "", buyPrice: "", priceUnit: "unit" });
  };

  const removeItemFromRestockList = (index) => {
    setItemsToRestock(itemsToRestock.filter((_, i) => i !== index));
  };

  const handleConfirmRestock = async () => {
    if (itemsToRestock.length === 0) {
      alert("Please add at least one item to restock.");
      return;
    }

    await runRestock(async () => {
      try {
        await api.post("/stocks/adjust-bulk", {
        shop_id: shopId,
        items: itemsToRestock.map(item => ({
          item_id: item.itemId,
          qty: item.quantity,
          buy_price: item.buyPrice,
          price_unit: item.priceUnit || "unit",
          movement_type: "purchase_in",
        })),
      });
      alert("Stock replenished successfully!");
      await fetchShopStock();
      setItemsToRestock([]);
      // Expand the inventory list section so user can see the updated stock
      setExpandedSection('stock');
      } catch (err) {
        alert(`Error adding stock: ${err.response?.data?.msg || err.message}`);
      }
    });
  };

  const handleEditStock = (stock) => {
    const item = availableItems.find(i => i.id === stock.item_id);
    setEditingStock({ ...stock, item_name: item?.name });
    setEditFormData({ qty: stock.qty ?? "", buy_price: stock.buy_price ?? "" });
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    try {
      await api.post("/stocks/adjust", {
        shop_id: parseInt(shopId),
        item_id: editingStock.item_id,
        qty: parseInt(editFormData.qty),
        buy_price: user?.role === 'admin' ? parseFloat(editFormData.buy_price) : undefined,
        movement_type: "manual_edit",
        override: true
      });
      alert("Stock updated successfully!");
      setEditingStock(null);
      fetchShopStock();
    } catch (err) {
      alert(`Error updating stock: ${err.response?.data?.msg || err.message}`);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val || 0);
  };

  const filteredSales = searchQuery 
    ? shopSales.filter(s => {
        if (searchType === 'date') return new Date(s.created_at).toISOString().split('T')[0] === searchQuery;
        return s.items?.some(item => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()));
      })
    : shopSales;

  const filteredStock = searchQuery
    ? shopStock.filter(s => {
        const item = availableItems.find(i => i.id === s.item_id);
        return item?.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : shopStock;

  if (!shop) {
    return <div className="flex bg-[#f1f5f9] dark:bg-[#0f172a] min-h-screen items-center justify-center text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest transition-colors">Loading shop data...</div>;
  }

  return (
    <>
        <div className="mb-8 flex items-center gap-3 transition-colors">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200 dark:shadow-none transition-colors">
            <Store size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight transition-colors">{shop.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium transition-colors">{shop.address}</p>
            {searchQuery && <p className="text-sm text-blue-500 font-bold mt-1">Searching for: "{searchQuery}"</p>}
          </div>
        </div>

        {/* SHOP METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 transition-colors">
          <Card title="Revenue (Filtered)" className="border-l-4 border-l-green-500">
            {formatCurrency(filteredSales.reduce((acc, sale) => acc + (sale.total_amount || 0), 0))}
          </Card>
          {user?.role === 'admin' && (
            <Card title="Stock Asset Value" className="border-l-4 border-l-purple-500">
              {formatCurrency(filteredStock.reduce((acc, s) => acc + ((s.buy_price || 0) * (s.qty || 0)), 0))}
            </Card>
          )}
        </div>

        {/* ADD STOCK FORM */}
        {canManageRestock ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-10 transition-colors">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2 transition-colors">
            <Plus size={24} className="text-blue-600 dark:text-blue-400" />
            Restock Products
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase mb-1 px-1 transition-colors">Product</label>
              <SearchableSelect
                options={availableItems}
                value={stockFormData.itemId}
                onChange={(e) => {
                  const id = e.target.value;
                  const selectedItem = availableItems.find(i => String(i.id) === String(id));
                  setStockFormData({
                    ...stockFormData,
                    itemId: id,
                    priceUnit: isGasLikeItem(selectedItem) ? 'per_kg' : 'unit',
                  });
                }}
                placeholder="Choose Product..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase mb-1 px-1 transition-colors">Quantity</label>
              <input name="quantity" type="number" className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all" value={stockFormData.quantity} onChange={handleStockInputChange} min="1" />
            </div>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase mb-1 px-1 transition-colors">Buy Price (Optional)</label>
                <input name="buyPrice" type="number" className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={stockFormData.buyPrice} onChange={handleStockInputChange} placeholder="Enter price" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase mb-1 px-1 transition-colors">Pricing Basis</label>
                <select
                  name="priceUnit"
                  className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={stockFormData.priceUnit}
                  onChange={handleStockInputChange}
                >
                  <option value="unit">Per Unit</option>
                  <option value="per_kg">Per KG</option>
                </select>
              </div>
            )}
          </div>
          
          <button onClick={addItemToRestockList} className="mt-6 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white py-3 px-10 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-2">
            <Plus size={18} /> Add Product to List
          </button>

          {itemsToRestock.length > 0 && (
            <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-8">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Items to be Restocked</h3>
              <div className="space-y-3">
                {itemsToRestock.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-10 h-10 rounded-lg flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{item.itemName}</p>
                        <p className="text-xs text-gray-500 font-medium">Qty: <span className="text-blue-600 dark:text-blue-400 font-bold">{item.quantity}</span> {item.buyPrice && `| Buy Price: ${formatCurrency(item.buyPrice)}${item.priceUnit === 'per_kg' ? ' (per kg input converted)' : ''}`}</p>
                      </div>
                    </div>
                    <button onClick={() => removeItemFromRestockList(idx)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all">
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={handleConfirmRestock} disabled={isRestocking} className="mt-6 bg-blue-600 text-white py-4 px-12 rounded-xl font-black shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition-all w-full md:w-auto uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
                {isRestocking ? 'Restocking...' : 'Confirm All & Restock'}
              </button>
            </div>
          )}
        </div>
        ) : user?.role === 'manager' ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-800 mb-10 text-amber-800 dark:text-amber-200">
            Restocking is currently disabled. Ask an administrator to enable your permission from the Admin Dashboard.
          </div>
        ) : null}

        <div className="flex flex-col">
        {/* SHOP SUMMARIES */}
        <div className="order-2">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 tracking-tight border-l-4 border-l-blue-600 pl-3 text-sm uppercase tracking-widest text-gray-400 dark:text-gray-500 transition-colors">Performance Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Today */}
            <div className="space-y-4">
              <Card title="Today's Sales" className="border-l-4 border-l-blue-500 !p-5">
                <span className="text-xl font-black">{salesSummary ? formatCurrency(salesSummary.today) : '...'}</span>
              </Card>
              {user?.role === 'admin' && <Card title="Today's Gross Profit" className={`border-l-4 !p-5 border-l-green-500`}>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-green-600 dark:text-green-400">
                    {pnlSummary.today ? formatCurrency(pnlSummary.today.gross_profit) : '...'}
                  </span>
                  {pnlSummary.today && pnlSummary.today.total_sales > 0 && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      Margin: {((pnlSummary.today.gross_profit / pnlSummary.today.total_sales) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </Card>}
            </div>

            {/* Week */}
            <div className="space-y-4">
              <Card title="This Week's Sales" className="border-l-4 border-l-blue-500 !p-5">
                <span className="text-xl font-black">{salesSummary ? formatCurrency(salesSummary.week) : '...'}</span>
              </Card>
              {user?.role === 'admin' && <Card title="This Week's Gross Profit" className={`border-l-4 !p-5 border-l-green-500`}>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-green-600 dark:text-green-400">
                    {pnlSummary.week ? formatCurrency(pnlSummary.week.gross_profit) : '...'}
                  </span>
                  {pnlSummary.week && pnlSummary.week.total_sales > 0 && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      Margin: {((pnlSummary.week.gross_profit / pnlSummary.week.total_sales) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </Card>}
            </div>

            {/* Month */}
            <div className="space-y-4">
              <Card title="This Month's Sales" className="border-l-4 border-l-blue-500 !p-5">
                <span className="text-xl font-black">{salesSummary ? formatCurrency(salesSummary.month) : '...'}</span>
              </Card>
              {user?.role === 'admin' && <Card title="This Month's Gross Profit" className={`border-l-4 !p-5 border-l-green-500`}>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-green-600 dark:text-green-400">
                    {pnlSummary.month ? formatCurrency(pnlSummary.month.gross_profit) : '...'}
                  </span>
                  {pnlSummary.month && pnlSummary.month.total_sales > 0 && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      Margin: {((pnlSummary.month.gross_profit / pnlSummary.month.total_sales) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </Card>}
            </div>

            {/* Year */}
            <div className="space-y-4">
              <Card title="This Year's Sales" className="border-l-4 border-l-blue-500 !p-5">
                <span className="text-xl font-black">{salesSummary ? formatCurrency(salesSummary.year) : '...'}</span>
              </Card>
              {user?.role === 'admin' && <Card title="This Year's Gross Profit" className={`border-l-4 !p-5 border-l-green-500`}>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-green-600 dark:text-green-400">
                    {pnlSummary.year ? formatCurrency(pnlSummary.year.gross_profit) : '...'}
                  </span>
                  {pnlSummary.year && pnlSummary.year.total_sales > 0 && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      Margin: {((pnlSummary.year.gross_profit / pnlSummary.year.total_sales) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </Card>}
            </div>
          </div>
        </div>

        {/* QUICK NAV CARDS */}
        <div className="order-1 grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <Link to={`/admin/shops/${shopId}/stock`} className="block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <Package size={28} className="text-purple-600" />
              <div>
                <h3 className="text-lg font-black">Full Stock List</h3>
                <p className="text-sm text-gray-500">{filteredStock.length} items</p>
              </div>
            </div>
          </Link>

          <Link to={`/admin/shops/${shopId}/sales`} className="block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <TrendingUp size={28} className="text-blue-600" />
              <div>
                <h3 className="text-lg font-black">Sales History</h3>
                <p className="text-sm text-gray-500">{filteredSales.length} records</p>
              </div>
            </div>
          </Link>

          <Link to={`/admin/shops/${shopId}/low-stock`} className="block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3">
              <AlertTriangle size={28} className="text-orange-500" />
              <div>
                <h3 className="text-lg font-black">Low Stock Alerts</h3>
                <p className="text-sm text-gray-500">{lowStockItems.length} items</p>
              </div>
            </div>
          </Link>
        </div>
        </div>

        {/* EDIT MODAL */}
        {editingStock && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="bg-blue-600 p-6 text-white flex justify-between items-center transition-colors">
                        <div>
                            <h3 className="text-xl font-bold">Edit Stock Quantity</h3>
                            <p className="text-blue-100 text-sm mt-1">{editingStock.item_name}</p>
                        </div>
                        <button onClick={() => setEditingStock(null)} className="text-white/80 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleUpdateStock} className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-widest mb-2 transition-colors">Current Quantity</label>
                            <input 
                                type="number" 
                                required
                                className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-lg"
                                value={editFormData.qty}
                                onChange={e => setEditFormData({...editFormData, qty: e.target.value})}
                                min="0"
                            />
                        </div>

                        {user?.role === 'admin' && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-widest mb-2 transition-colors">Buy Price (KES)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                    value={editFormData.buy_price}
                                    onChange={e => setEditFormData({...editFormData, buy_price: e.target.value})}
                                />
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 transition-colors">
                            <button 
                                type="button" 
                                onClick={() => setEditingStock(null)}
                                className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Update Stock
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

    </>
  );
}

function Section({ title, count, icon: Icon, color, isExpanded, onToggle, children }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-blue-100 dark:border-blue-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border-indigo-100 dark:border-indigo-800',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 border-purple-100 dark:border-purple-800',
    orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 border-orange-100 dark:border-orange-800',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      <button 
        onClick={onToggle}
        className={`w-full flex justify-between items-center p-6 transition-all border-b border-transparent ${isExpanded ? 'border-gray-100 dark:border-gray-700 shadow-sm' : ''} ${colors[color]}`}
      >
        <div className="flex items-center gap-3">
          <Icon size={24} className={isExpanded ? 'animate-pulse' : ''} />
          <h2 className="text-xl font-bold tracking-tight">{title} <span className="ml-2 text-sm opacity-60">({count})</span></h2>
        </div>
        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </button>
      {isExpanded && (
        <div className="p-0 overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar transition-colors">
          {count === 0 ? (
            <div className="p-10 text-center text-gray-400 dark:text-gray-500 italic font-medium tracking-widest uppercase text-xs transition-colors">
                <SearchX size={32} className="mx-auto mb-2 opacity-20" />
                No records match your search
            </div>
          ) : children}
        </div>
      )}
    </div>
  )
}
