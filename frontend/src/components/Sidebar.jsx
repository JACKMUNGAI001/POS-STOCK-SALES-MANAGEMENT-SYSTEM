import React, { useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { 
  LayoutDashboard, 
  Store, 
  Package, 
  TrendingUp, 
  BarChart3,
  CreditCard,
  Receipt, 
  ArrowLeftRight, 
  UserCircle,
  Users,
  FileText,
  Truck,
  X,
  Cylinder
} from 'lucide-react'

export default function Sidebar({ role: propRole, onClose }){
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const role = propRole || user?.role;

  const isActive = (path) => location.pathname === path;

  const NavLink = ({ to, icon: Icon, children }) => (
    <Link 
      to={to} 
      onClick={onClose}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        isActive(to) 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{children}</span>
    </Link>
  );

  return (
    <aside className="w-64 min-h-screen h-full bg-[#1e293b] text-white flex flex-col shadow-2xl overflow-y-auto">
      <div className="p-6 border-b border-gray-700 mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold tracking-tight">Gas POS System</h2>
        <button onClick={onClose} className="lg:hidden p-1 text-gray-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 pb-10">
        {role === 'admin' ? (
          <>
            <NavLink to="/admin" icon={LayoutDashboard}>Dashboard</NavLink>
            <NavLink to="/pos" icon={Receipt}>Record Sale</NavLink>
            <NavLink to="/pos/credit" icon={Receipt}>Record Credit Sale</NavLink>
            <NavLink to="/deposits" icon={Store}>New Deposit</NavLink>
            <NavLink to="/attendant/deposits" icon={Users}>Active Deposits</NavLink>
            <NavLink to="/admin/all-sales" icon={BarChart3}>Total Sales</NavLink>
            <NavLink to="/admin/credit-sales" icon={CreditCard}>Credit Sales</NavLink>
            <NavLink to="/admin/shops" icon={Store}>Shops</NavLink>
            <NavLink to="/admin/items" icon={Package}>Products</NavLink>
            <NavLink to="/empty-cylinders" icon={Cylinder}>Empty Cylinders</NavLink>
            <NavLink to="/empty-cylinders/outstanding" icon={Cylinder}>Cylinders Not Returned</NavLink>
            <NavLink to="/admin/restock-history" icon={Truck}>Restock History</NavLink>
            <NavLink to="/admin/suppliers" icon={Truck}>Suppliers</NavLink>
            <NavLink to="/admin/analysis" icon={BarChart3}>Sales Analysis</NavLink>
            <NavLink to="/admin/pnl" icon={TrendingUp}>Profit & Loss</NavLink>
            <NavLink to="/admin/expenses" icon={Receipt}>Expenses</NavLink>
            <NavLink to="/transfers" icon={ArrowLeftRight}>Transfers</NavLink>
          </>
        ) : role === 'manager' ? (
          <>
            <NavLink to="/manager" icon={LayoutDashboard}>Dashboard</NavLink>
            <NavLink to="/pos" icon={Receipt}>Record Sale</NavLink>
            <NavLink to="/pos/credit" icon={Receipt}>Record Credit Sale</NavLink>
            <NavLink to="/deposits" icon={Store}>New Deposit</NavLink>
            <NavLink to="/attendant/deposits" icon={Users}>Active Deposits</NavLink>
            <NavLink to="/admin/all-sales" icon={BarChart3}>Total Sales</NavLink>
            <NavLink to="/admin/credit-sales" icon={CreditCard}>Credit Sales</NavLink>
            <NavLink to="/admin/shops" icon={Store}>Shops</NavLink>
            <NavLink to="/empty-cylinders" icon={Cylinder}>Empty Cylinders</NavLink>
            <NavLink to="/empty-cylinders/outstanding" icon={Cylinder}>Cylinders Not Returned</NavLink>
            <NavLink to="/admin/restock-history" icon={Truck}>Restock History</NavLink>
            <NavLink to="/transfers" icon={ArrowLeftRight}>Transfers</NavLink>
            <NavLink to="/admin/expenses" icon={Receipt}>Expenses</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/attendant" icon={LayoutDashboard}>Dashboard</NavLink>
            <NavLink to="/pos" icon={Receipt}>Record Sale</NavLink>
            <NavLink to="/pos/credit" icon={Receipt}>Record Credit Sale</NavLink>
            <NavLink to="/deposits" icon={Store}>New Deposit</NavLink>
            <NavLink to="/attendant/deposits" icon={Users}>Active Deposits</NavLink>
            <NavLink to="/admin/credit-sales" icon={CreditCard}>Credit Sales</NavLink>
            <NavLink to="/empty-cylinders" icon={Cylinder}>Empty Cylinders</NavLink>
            <NavLink to="/empty-cylinders/outstanding" icon={Cylinder}>Cylinders Not Returned</NavLink>
          </>
        )}
        
        <div className="pt-6 mt-6 border-t border-gray-700">
          <NavLink to="/profile" icon={UserCircle}>Your Profile</NavLink>
        </div>
      </nav>
    </aside>
  )
}
