import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight } from 'lucide-react'

export default function TransferCardLink(){
  return (
    <div className="mt-10">
      <Link to="/transfers/history" className="no-underline group">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50">
          <div className="w-full flex justify-between items-center p-6">
            <div className="flex items-center gap-3">
              <ArrowLeftRight size={20} className="sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              <div className="text-left">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white tracking-tight">Van Transfer History</h2>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">View stock movements between vans</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">View</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}
