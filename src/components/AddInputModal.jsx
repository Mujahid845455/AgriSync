import React, { useState } from 'react';
import { X, Wheat, Ruler, BadgeIndianRupee } from 'lucide-react';

export default function AddInputModal({ isOpen, onClose, onAdd }) {
  const [inputName, setInputName] = useState('');
  const [uom, setUom] = useState('Kg');
  const [salePrice, setSalePrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputName.trim() || !uom.trim() || !salePrice) {
      setError('Please fill in all fields.');
      return;
    }

    if (Number(salePrice) < 0) {
      setError('Sale price cannot be negative.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAdd({
        inputName: inputName.trim(),
        uom: uom.trim(),
        salePrice: Number(salePrice),
      });
      // Reset form
      setInputName('');
      setUom('Kg');
      setSalePrice('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md glass-modal p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Decorative corner glow */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary-500/20 rounded-full blur-2xl" />

        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Wheat className="w-5 h-5 text-primary-400" />
            Add New Agri Input
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/30 border border-red-800/50 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Input Name
            </label>
            <div className="relative">
              <Wheat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="e.g. Urea, Potash, DAP"
                className="w-full glass-input pl-10 pr-4 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                UOM (Unit)
              </label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select
                  value={uom}
                  onChange={(e) => setUom(e.target.value)}
                  className="w-full glass-input pl-10 pr-4 py-2 text-sm appearance-none bg-slate-900"
                >
                  <option value="Kg">Kg</option>
                  <option value="Litre">Litre</option>
                  <option value="Bag">Bag</option>
                  <option value="Nos">Nos</option>
                  <option value="Packet">Packet</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Sale Price (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">₹</span>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="250"
                  className="w-full glass-input pl-8 pr-4 py-2 text-sm"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-medium border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 active:scale-95 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-primary-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? 'Adding...' : 'Add Input'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
