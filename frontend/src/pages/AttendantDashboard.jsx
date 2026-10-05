import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import { AuthContext } from '../context/AuthContext'
import { SearchContext } from '../context/SearchContext'
import api from '../api/api'
import { Store, Package, TrendingUp, Wallet, SearchX, CreditCard } from 'lucide-react'
import TransferCardLink from '../components/TransferCardLink'

export default function AttendantDashboard(){
  const { user } = useContext(AuthContext)
  const { searchQuery } = useContext(SearchContext)
  const [shopStock, setShopStock] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [salesSummary, setSalesSummary] = useState(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [stockSummary, setStockSummary] = useState(null);

  useEffect(() => {
    if (user?.shop_id) {
      fetchShopStock(user.shop_id);
    }
    fetchAvailableItems();

    const fetchDashboardData = async () => {
        try {
            // Unified dashboard summary call
            const res = await api.get('/reports/dashboard-summary');
            const data = res.data;
            
            setSalesSummary(data.sales);
            setLowStockCount(data.low_stock_count);
            setStockSummary(data.stock_summary);

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        }
    };

    fetchDashboardData();
  }, [user?.shop_id]);

  const fetchShopStock = async (shopId) => {
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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val || 0);
  };

  const filteredStock = searchQuery 
    ? shopStock.filter(stock => stock.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : shopStock;

  return (
    <>
        {user?.shop_name && (
          <div className="mb-6 flex items-center gap-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg border border-blue-100 dark:border-blue-800 w-fit transition-colors">
            <Store size={20} />
            <span className="font-bold">Your Location: {user.shop_name}</span>
          </div>
        )}

        {/* SALES SUMMARY */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 tracking-tight border-l-4 border-l-blue-600 pl-3 text-sm uppercase tracking-widest text-gray-400 dark:text-gray-500 transition-colors">Sales Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <Link to="/attendant/sales" className="no-underline group">
                <Card title="Today's Sales" interactive={true} className="!p-4 sm:!p-6 text-xl">
                  {salesSummary ? formatCurrency(salesSummary.today) : '...'}
                </Card>
            </Link>
            <Link to="/attendant/sales/week" className="no-underline group">
                <Card title="This Week's" interactive={true} className="!p-4 sm:!p-6 text-xl">
                  {salesSummary ? formatCurrency(salesSummary.week) : '...'}
                </Card>
            </Link>
            <Link to="/attendant/sales/month" className="no-underline group">
                <Card title="This Month's" interactive={true} className="!p-4 sm:!p-6 text-xl">
                  {salesSummary ? formatCurrency(salesSummary.month) : '...'}
                </Card>
            </Link>
            <Link to="/attendant/sales/year" className="no-underline group">
                <Card title="This Year's" interactive={true} className="!p-4 sm:!p-6 text-xl">
                  {salesSummary ? formatCurrency(salesSummary.year) : '...'}
                </Card>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-10">
          <Link to="/attendant/low-stock" className="no-underline group">
              <Card title="Low Stock Items" interactive={true} className="border-l-4 border-l-orange-500 flex justify-between items-center !p-5 sm:!p-6">
                <span className="text-2xl sm:text-3xl">{lowStockCount}</span>
                <Package className="text-orange-200 dark:text-orange-900/30 group-hover:text-orange-400 dark:group-hover:text-orange-500 transition-colors" size={32} />
              </Card>
          </Link>
          <Link to="/pos/credit" className="no-underline group">
              <Card title="Record Credit Sale" interactive={true} className="border-l-4 border-l-amber-500 flex justify-between items-center !p-5 sm:!p-6">
                <span className="text-sm font-bold uppercase">Customer Credit</span>
                <CreditCard className="text-amber-200 dark:text-amber-900/30 group-hover:text-amber-400 dark:group-hover:text-amber-500 transition-colors" size={32} />
              </Card>
          </Link>
          <Link to="/admin/credit-sales" className="no-underline group">
              <Card title="Credit Sales" interactive={true} className="border-l-4 border-l-violet-500 flex justify-between items-center !p-5 sm:!p-6">
                <span className="text-sm font-bold uppercase">Follow Up</span>
                <CreditCard className="text-violet-200 dark:text-violet-900/30 group-hover:text-violet-400 dark:group-hover:text-violet-500 transition-colors" size={32} />
              </Card>
          </Link>
        </div>


        {/* STOCK SUMMARY BY CATEGORY */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight border-l-4 border-l-green-600 pl-3 text-sm uppercase tracking-widest text-gray-400 dark:text-gray-500 transition-colors mb-4">
            Stock Summary by Category
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stockSummary && Object.entries(stockSummary).map(([shopName, categories]) => (
                <div key={shopName} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-green-100 dark:border-gray-700 bg-gradient-to-br from-white to-green-50/30 dark:from-gray-800 dark:to-green-900/10 transition-all">
                  <div className="space-y-3">
                    {Object.entries(categories).map(([category, quantity]) => (
                      <div key={category} className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-xl border border-gray-50 dark:border-gray-700 group hover:border-green-300 dark:hover:border-green-800 transition-all cursor-default">
                        <span className="text-gray-600 dark:text-gray-400 font-bold tracking-tight">{category}s</span>
                        <span className="text-lg font-black text-gray-900 dark:text-white bg-green-100 dark:bg-green-900/50 px-3 py-1 rounded-lg text-green-700 dark:text-green-400 group-hover:scale-110 transition-transform">{quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* TRANSFER HISTORY */}
        <TransferCardLink />

        <div className="mt-10">
          <Link to="/attendant/inventory" className="no-underline group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50">
              <div className="w-full flex justify-between items-center p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp size={24} className="text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Current Inventory</h2>
                    {searchQuery && <p className="text-sm font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full mt-1">Searching: "{searchQuery}"</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">View</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </>
  )
}
