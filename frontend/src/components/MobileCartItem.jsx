import React from 'react';
import { Trash2 } from 'lucide-react';

export default function MobileCartItem({ item, index, cartItems, setCartItems, onRemove, operation = 'shop' }) {
  const isGas = item.tracksEmptyCylinder;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-black text-blue-600 dark:text-blue-400 truncate">{item.name}</h3>
          <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            Qty: <span className="font-bold text-gray-700 dark:text-gray-300">{item.qty}</span> &nbsp;|&nbsp;
            Unit: <span className="font-bold text-gray-700 dark:text-gray-300">KES {item.unit_price.toLocaleString()}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-sm font-black text-gray-900 dark:text-white">
            KES {(item.qty * item.unit_price).toLocaleString()}
          </span>
        </div>
      </div>

      {isGas && (
        <p className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">
          {operation === 'van'
            ? 'Record empty cylinders collected in Van Inventory before depot refilling.'
            : `${item.qty} empty cylinder${item.qty === 1 ? '' : 's'} exchanged at the shop.`}
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onRemove(index)}
          className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-600 dark:border-red-700 dark:text-red-400"
        >
          <Trash2 size={14} /> Remove
        </button>
      </div>
    </div>
  );
}
