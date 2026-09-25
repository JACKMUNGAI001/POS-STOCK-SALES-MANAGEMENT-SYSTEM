import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { SearchProvider } from './context/SearchContext'
import ProtectedRoute from './components/ProtectedRoute'
import PageLayout from './components/PageLayout'

const Login = React.lazy(() => import('./pages/Login'))
const Register = React.lazy(() => import('./pages/Register'))
const Landing = React.lazy(() => import('./pages/Landing'))
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'))
const AttendantDashboard = React.lazy(() => import('./pages/AttendantDashboard'))
const POS = React.lazy(() => import('./pages/POS'))
const RecordCreditSale = React.lazy(() => import('./pages/RecordCreditSale'))
const Deposits = React.lazy(() => import('./pages/Deposits'))
const Transfers = React.lazy(() => import('./pages/Transfers'))
const AttendantTransfers = React.lazy(() => import('./pages/AttendantTransfers'))
const AttendantInventory = React.lazy(() => import('./pages/AttendantInventory'))
const Expenses = React.lazy(() => import('./pages/Expenses'))
const Profile = React.lazy(() => import('./pages/Profile'))
const PNLReport = React.lazy(() => import('./pages/PNLReport'))
const SalesAnalysis = React.lazy(() => import('./pages/SalesAnalysis'))
const AdminShops = React.lazy(() => import('./pages/AdminShops'))
const AdminItems = React.lazy(() => import('./pages/AdminItems'))
const ShopDetails = React.lazy(() => import('./pages/ShopDetails'))
const AdminShopStock = React.lazy(() => import('./pages/AdminShopStock'))
const ShopSales = React.lazy(() => import('./pages/ShopSales'))
const ShopDeposits = React.lazy(() => import('./pages/ShopDeposits'))
const ShopLowStock = React.lazy(() => import('./pages/ShopLowStock'))
const AllSales = React.lazy(() => import('./pages/AllSales'))
const AllDeposits = React.lazy(() => import('./pages/AllDeposits'))
const OutstandingDeposits = React.lazy(() => import('./pages/OutstandingDeposits'))
const OutstandingCredits = React.lazy(() => import('./pages/OutstandingCredits'))
const AdminSuppliers = React.lazy(() => import('./pages/AdminSuppliers'))
const AdminSupplierInvoices = React.lazy(() => import('./pages/AdminSupplierInvoices'))
const ManagerDashboard = React.lazy(() => import('./pages/ManagerDashboard'))
const TodaysSales = React.lazy(() => import('./pages/TodaysSales'))
const CreditSales = React.lazy(() => import('./pages/CreditSales'))
const WeeksSales = React.lazy(() => import('./pages/WeeksSales'))
const MonthsSales = React.lazy(() => import('./pages/MonthsSales'))
const YearsSales = React.lazy(() => import('./pages/YearsSales'))
const LowStockItems = React.lazy(() => import('./pages/LowStockItems'))
const DepositCustomers = React.lazy(() => import('./pages/DepositCustomers'))
const TodaysDeposits = React.lazy(() => import('./pages/TodaysDeposits'))
const WeeksDeposits = React.lazy(() => import('./pages/WeeksDeposits'))
const MonthsDeposits = React.lazy(() => import('./pages/MonthsDeposits'))
const YearsDeposits = React.lazy(() => import('./pages/YearsDeposits'))
const RestockHistory = React.lazy(() => import('./pages/RestockHistory'))
const GlobalInventory = React.lazy(() => import('./pages/GlobalInventory'))
const EmptyCylinders = React.lazy(() => import('./pages/EmptyCylinders'))
const OutstandingEmptyCylinders = React.lazy(() => import('./pages/OutstandingEmptyCylinders'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-gray-500 dark:text-gray-400 text-lg">Loading...</div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <SearchProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <Suspense fallback={<LoadingFallback />}>
              <Routes>

              {/* Public pages */}
              <Route path="/" element={<Landing/>} />
              <Route path="/login" element={<Login/>} />
              <Route path="/register" element={<Register/>} />

              {/* Common Protected */}
              <Route path="/profile" element={<ProtectedRoute><PageLayout><Profile/></PageLayout></ProtectedRoute>} />

              {/* Admin/Manager Protected */}
              <Route path="/admin" element={<ProtectedRoute role="admin"><PageLayout><AdminDashboard/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/shops" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><AdminShops/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/items" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><AdminItems/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/restock-history" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><RestockHistory/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/suppliers" element={<ProtectedRoute role="admin"><PageLayout role="admin" title="Suppliers Management"><AdminSuppliers/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/supplier-invoices" element={<ProtectedRoute role="admin"><PageLayout role="admin" title="Supplier Invoices"><AdminSupplierInvoices/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/shops/:shopId" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><ShopDetails/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/shops/:shopId/stock" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><AdminShopStock/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/shops/:shopId/sales" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><ShopSales/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/shops/:shopId/deposits" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><ShopDeposits/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/shops/:shopId/low-stock" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><ShopLowStock/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/all-sales" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><AllSales/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/all-deposits" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><AllDeposits/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/outstanding-deposits" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><OutstandingDeposits/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/outstanding-credits" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><OutstandingCredits/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/credit-sales" element={<ProtectedRoute role={['admin', 'manager', 'attendant']}><PageLayout><CreditSales/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/pnl" element={<ProtectedRoute role="admin"><PageLayout role="admin"><PNLReport/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/analysis" element={<ProtectedRoute role="admin"><PageLayout role="admin" title="Sales Analysis"><SalesAnalysis/></PageLayout></ProtectedRoute>} />
              <Route path="/admin/expenses" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><Expenses/></PageLayout></ProtectedRoute>} />
              <Route path="/transfers" element={<ProtectedRoute role={['admin', 'manager']}><PageLayout><Transfers/></PageLayout></ProtectedRoute>} />
              <Route path="/transfers/history" element={<ProtectedRoute role={["attendant","manager","admin"]}><PageLayout><AttendantTransfers/></PageLayout></ProtectedRoute>} />
              <Route path="/attendant/transfers" element={<ProtectedRoute role={["attendant","manager","admin"]}><PageLayout><AttendantTransfers/></PageLayout></ProtectedRoute>} />

              {/* Attendant Protected */}
              <Route path="/attendant" element={<ProtectedRoute role="attendant"><PageLayout role="attendant"><AttendantDashboard/></PageLayout></ProtectedRoute>} />
              <Route path="/pos" element={<ProtectedRoute role={['attendant', 'manager', 'admin']}><PageLayout><POS/></PageLayout></ProtectedRoute>} />
              <Route path="/pos/credit" element={<ProtectedRoute role={['attendant', 'manager', 'admin']}><PageLayout><RecordCreditSale/></PageLayout></ProtectedRoute>} />
              <Route path="/deposits" element={<ProtectedRoute role={['attendant', 'manager', 'admin']}><PageLayout><Deposits/></PageLayout></ProtectedRoute>} />
              <Route path="/attendant/low-stock" element={<ProtectedRoute role={['attendant', 'manager', 'admin']}><PageLayout><LowStockItems /></PageLayout></ProtectedRoute>} />
              <Route path="/attendant/inventory" element={<ProtectedRoute role={['attendant', 'manager', 'admin']}><PageLayout role="attendant"><AttendantInventory/></PageLayout></ProtectedRoute>} />
              
              {/* Manager Protected */}
              <Route path="/manager" element={<ProtectedRoute role="manager"><PageLayout role="manager"><ManagerDashboard/></PageLayout></ProtectedRoute>} />
              <Route path="/global-inventory" element={<ProtectedRoute role={['admin','manager']}><PageLayout><GlobalInventory/></PageLayout></ProtectedRoute>} />
              <Route path="/empty-cylinders" element={<ProtectedRoute role={['attendant','manager','admin']}><PageLayout><EmptyCylinders/></PageLayout></ProtectedRoute>} />
              <Route path="/empty-cylinders/outstanding" element={<ProtectedRoute role={['attendant','manager','admin']}><PageLayout><OutstandingEmptyCylinders/></PageLayout></ProtectedRoute>} />
              
              {/* Filtered Detail Views (Shared) */}
              <Route path="/attendant/sales" element={<ProtectedRoute><PageLayout><TodaysSales /></PageLayout></ProtectedRoute>} />
              <Route path="/attendant/sales/week" element={<ProtectedRoute><PageLayout><WeeksSales /></PageLayout></ProtectedRoute>} />
              <Route path="/attendant/sales/month" element={<ProtectedRoute><PageLayout><MonthsSales /></PageLayout></ProtectedRoute>} />
              <Route path="/attendant/sales/year" element={<ProtectedRoute><PageLayout><YearsSales /></PageLayout></ProtectedRoute>} />
              
              <Route path="/attendant/deposits" element={<ProtectedRoute><PageLayout><DepositCustomers /></PageLayout></ProtectedRoute>} />
              <Route path="/attendant/deposits/today" element={<ProtectedRoute><PageLayout><TodaysDeposits /></PageLayout></ProtectedRoute>} />
              <Route path="/attendant/deposits/week" element={<ProtectedRoute><PageLayout><WeeksDeposits /></PageLayout></ProtectedRoute>} />
              <Route path="/attendant/deposits/month" element={<ProtectedRoute><PageLayout><MonthsDeposits /></PageLayout></ProtectedRoute>} />
              <Route path="/attendant/deposits/year" element={<ProtectedRoute><PageLayout><YearsDeposits /></PageLayout></ProtectedRoute>} />

            </Routes>
          </Suspense>
        </BrowserRouter>
        </SearchProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
)
