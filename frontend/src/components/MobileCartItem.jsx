import React from 'react';
import { Trash2 } from 'lucide-react';

export default function MobileCartItem({ item, index, cartItems, setCartItems, onRemove, operation = 'shop' }) {
  const isGas = item.tracksEmptyCylinder;

  const handleEmptyQtyChange = (e) => {
    const val = e.target.value;
    setCartItems(cartItems.map((cartItem, i) => i === index ? { ...cartItem, empty_qty: val } : cartItem));
  };

  const toggleNoEmptyReturned = () => {
    const nextNoEmpty = !item.noEmptyReturned;
    setCartItems(cartItems.map((cartItem, i) => i === index ? {
      ...cartItem,
      noEmptyReturned: nextNoEmpty,
      empty_qty: nextNoEmpty ? 0 : cartItem.qty,
    } : cartItem));
  };

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
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={item.noEmptyReturned || false}
              onChange={toggleNoEmptyReturned}
              className="rounded border-gray-300"
            />
            {operation === 'van' ? 'No empty collected' : 'No empty returned'}
          </label>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">{operation === 'van' ? 'Empty Collected' : 'Empty Returned'}</label>
            <input
              type="number"
              min="0"
              max={item.qty}
              value={item.empty_qty || ''}
              onChange={handleEmptyQtyChange}
              disabled={item.noEmptyReturned}
              className="w-full rounded border p-2 text-center text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
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
