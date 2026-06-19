import React, { useState } from 'react';
import { Edit2, Trash2, Check, X, Info } from 'lucide-react';

export default function InventoryTable({ 
  items, 
  onSaveCellChange, 
  onUpdateMetadata, 
  onDeleteItem,
  hasUnsavedChanges
}) {
  const [editingMetaId, setEditingMetaId] = useState(null);
  const [metaFields, setMetaFields] = useState({ inputName: '', uom: 'Kg', salePrice: 0 });

  const startMetaEdit = (item) => {
    setEditingMetaId(item._id);
    setMetaFields({
      inputName: item.inputName,
      uom: item.uom,
      salePrice: item.salePrice
    });
  };

  const handleMetaSave = async (id) => {
    if (!metaFields.inputName.trim() || !metaFields.uom.trim() || metaFields.salePrice < 0) return;
    await onUpdateMetadata(id, metaFields);
    setEditingMetaId(null);
  };

  // Helper to calculate column totals
  const getTotals = () => {
    return items.reduce((acc, item) => {
      acc.procuredOn += item.procured?.onDate || 0;
      acc.procuredTo += item.procured?.toDate || 0;
      acc.distCashOn += item.distributedCash?.onDate || 0;
      acc.distCashTo += item.distributedCash?.toDate || 0;
      acc.distLoanOn += item.distributedLoan?.onDate || 0;
      acc.distLoanTo += item.distributedLoan?.toDate || 0;
      acc.balance += item.balance || 0;
      acc.cashPayOn += item.cashPayment?.onDate || 0;
      acc.cashPayTo += item.cashPayment?.toDate || 0;
      acc.loanPayOn += item.loanPayment?.onDate || 0;
      acc.loanPayTo += item.loanPayment?.toDate || 0;
      acc.totalPay += item.totalPayment || 0;
      acc.outstanding += item.outstandingAmount || 0;
      return acc;
    }, {
      procuredOn: 0, procuredTo: 0,
      distCashOn: 0, distCashTo: 0,
      distLoanOn: 0, distLoanTo: 0,
      balance: 0,
      cashPayOn: 0, cashPayTo: 0,
      loanPayOn: 0, loanPayTo: 0,
      totalPay: 0, outstanding: 0
    });
  };

  const totals = getTotals();

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between">
        <h4 className="text-sm font-semibold tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-primary-400" />
          Interactive Spreadsheet Grid
        </h4>
        {hasUnsavedChanges && (
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-950/40 border border-amber-800/40 text-amber-400 rounded-full animate-pulse">
            Unsaved Cell Changes
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left min-w-[1500px]">
          <thead>
            {/* Double Grouped Header Row 1 */}
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider text-center">
              <th colSpan="3" className="border-r border-slate-800 py-3 text-left pl-4">Item Details</th>
              <th colSpan="2" className="border-r border-slate-800 py-3 bg-primary-950/10">Procured (Qty)</th>
              <th colSpan="2" className="border-r border-slate-800 py-3">Dist. Against Cash (Qty)</th>
              <th colSpan="2" className="border-r border-slate-800 py-3 bg-primary-950/10">Dist. Against Loan (Qty)</th>
              <th colSpan="1" className="border-r border-slate-800 py-3">Factory Balance</th>
              <th colSpan="2" className="border-r border-slate-800 py-3 bg-primary-950/10">Cash Payments (₹)</th>
              <th colSpan="2" className="border-r border-slate-800 py-3">Loan Payments (₹)</th>
              <th colSpan="2" className="border-r border-slate-800 py-3 bg-emerald-950/10 text-emerald-400">Financial Summary (₹)</th>
              <th className="py-3">Actions</th>
            </tr>

            {/* Double Grouped Header Row 2 */}
            <tr className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="pl-4 py-2.5 w-[180px]">Agri Input Name</th>
              <th className="py-2.5 w-[80px]">UOM</th>
              <th className="border-r border-slate-800 py-2.5 w-[100px]">Sale Price</th>
              
              <th className="py-2.5 text-center w-[90px] bg-primary-950/5 text-primary-400">On Date</th>
              <th className="border-r border-slate-800 py-2.5 text-center w-[95px] bg-primary-950/5">To Date</th>
              
              <th className="py-2.5 text-center w-[90px] text-blue-400">On Date</th>
              <th className="border-r border-slate-800 py-2.5 text-center w-[95px]">To Date</th>
              
              <th className="py-2.5 text-center w-[90px] bg-primary-950/5 text-indigo-400">On Date</th>
              <th className="border-r border-slate-800 py-2.5 text-center w-[95px] bg-primary-950/5">To Date</th>
              
              <th className="border-r border-slate-800 py-2.5 text-center w-[95px] text-teal-400">Closing Stock</th>
              
              <th className="py-2.5 text-center w-[110px] bg-primary-950/5 text-cyan-400">On Date</th>
              <th className="border-r border-slate-800 py-2.5 text-center w-[115px] bg-primary-950/5">To Date</th>
              
              <th className="py-2.5 text-center w-[110px] text-sky-400">On Date</th>
              <th className="border-r border-slate-800 py-2.5 text-center w-[115px]">To Date</th>
              
              <th className="py-2.5 text-center w-[120px] bg-emerald-950/5 text-emerald-400 font-semibold">Total Paid</th>
              <th className="border-r border-slate-800 py-2.5 text-center w-[120px] bg-emerald-950/5 text-amber-400 font-semibold">Outstanding</th>
              
              <th className="py-2.5 text-center w-[100px]">Manage</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 text-sm">
            {items.map((item) => {
              const isMetaEditing = editingMetaId === item._id;
              const hasOutstanding = item.outstandingAmount > 0;

              return (
                <tr 
                  key={item._id} 
                  className="hover:bg-slate-900/30 transition-colors duration-150 group/row"
                >
                  {/* Item Metadata */}
                  <td className="pl-4 py-2 font-medium text-slate-200">
                    {isMetaEditing ? (
                      <input
                        type="text"
                        value={metaFields.inputName}
                        onChange={(e) => setMetaFields({ ...metaFields, inputName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary-500"
                      />
                    ) : (
                      item.inputName
                    )}
                  </td>
                  <td className="py-2 text-slate-400">
                    {isMetaEditing ? (
                      <select
                        value={metaFields.uom}
                        onChange={(e) => setMetaFields({ ...metaFields, uom: e.target.value })}
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary-500"
                      >
                        <option value="Kg">Kg</option>
                        <option value="Litre">Litre</option>
                        <option value="Bag">Bag</option>
                        <option value="Nos">Nos</option>
                        <option value="Packet">Packet</option>
                      </select>
                    ) : (
                      item.uom
                    )}
                  </td>
                  <td className="border-r border-slate-800 py-2 text-slate-300">
                    {isMetaEditing ? (
                      <input
                        type="number"
                        value={metaFields.salePrice}
                        onChange={(e) => setMetaFields({ ...metaFields, salePrice: Number(e.target.value) })}
                        className="w-[80px] bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary-500"
                        min="0"
                      />
                    ) : (
                      `₹${item.salePrice.toFixed(2)}`
                    )}
                  </td>

                  {/* Procured */}
                  <td className="p-0 bg-primary-950/5">
                    <input
                      type="number"
                      value={item.procured?.onDate === 0 ? '' : item.procured?.onDate}
                      onChange={(e) => onSaveCellChange(item._id, 'procured', e.target.value)}
                      placeholder="0"
                      className="table-input"
                    />
                  </td>
                  <td className="border-r border-slate-800 py-2 text-center text-slate-400 bg-primary-950/5">
                    {item.procured?.toDate || 0}
                  </td>

                  {/* Distributed Cash */}
                  <td className="p-0">
                    <input
                      type="number"
                      value={item.distributedCash?.onDate === 0 ? '' : item.distributedCash?.onDate}
                      onChange={(e) => onSaveCellChange(item._id, 'distributedCash', e.target.value)}
                      placeholder="0"
                      className="table-input"
                    />
                  </td>
                  <td className="border-r border-slate-800 py-2 text-center text-slate-400">
                    {item.distributedCash?.toDate || 0}
                  </td>

                  {/* Distributed Loan */}
                  <td className="p-0 bg-primary-950/5">
                    <input
                      type="number"
                      value={item.distributedLoan?.onDate === 0 ? '' : item.distributedLoan?.onDate}
                      onChange={(e) => onSaveCellChange(item._id, 'distributedLoan', e.target.value)}
                      placeholder="0"
                      className="table-input"
                    />
                  </td>
                  <td className="border-r border-slate-800 py-2 text-center text-slate-400 bg-primary-950/5">
                    {item.distributedLoan?.toDate || 0}
                  </td>

                  {/* Closing Stock */}
                  <td className="border-r border-slate-800 py-2 text-center text-teal-400 font-semibold">
                    {item.balance || 0}
                  </td>

                  {/* Cash Payment */}
                  <td className="p-0 bg-primary-950/5">
                    <input
                      type="number"
                      value={item.cashPayment?.onDate === 0 ? '' : item.cashPayment?.onDate}
                      onChange={(e) => onSaveCellChange(item._id, 'cashPayment', e.target.value)}
                      placeholder="0"
                      className="table-input"
                    />
                  </td>
                  <td className="border-r border-slate-800 py-2 text-center text-slate-400 bg-primary-950/5">
                    ₹{item.cashPayment?.toDate?.toLocaleString() || 0}
                  </td>

                  {/* Loan Payment */}
                  <td className="p-0">
                    <input
                      type="number"
                      value={item.loanPayment?.onDate === 0 ? '' : item.loanPayment?.onDate}
                      onChange={(e) => onSaveCellChange(item._id, 'loanPayment', e.target.value)}
                      placeholder="0"
                      className="table-input"
                    />
                  </td>
                  <td className="border-r border-slate-800 py-2 text-center text-slate-400">
                    ₹{item.loanPayment?.toDate?.toLocaleString() || 0}
                  </td>

                  {/* Financial calculations */}
                  <td className="py-2 text-center text-emerald-400 font-semibold bg-emerald-950/5">
                    ₹{item.totalPayment?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </td>
                  <td className={`border-r border-slate-800 py-2 text-center font-semibold bg-emerald-950/5 ${hasOutstanding ? 'text-amber-400' : 'text-slate-400'}`}>
                    ₹{item.outstandingAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </td>

                  {/* Row Actions */}
                  <td className="py-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover/row:opacity-100 transition-opacity duration-200">
                      {isMetaEditing ? (
                        <>
                          <button
                            onClick={() => handleMetaSave(item._id)}
                            className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg transition-all"
                            title="Save details"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingMetaId(null)}
                            className="p-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
                            title="Cancel details edit"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startMetaEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-slate-800/80 rounded-lg transition-all"
                            title="Edit metadata"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete Agri Input "${item.inputName}"? This will delete all historic transactions too.`)) {
                                onDeleteItem(item._id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-all"
                            title="Delete row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan="17" className="text-center py-12 text-slate-500">
                  No agricultural inputs found. Click "Add Agri Input" to register your first item.
                </td>
              </tr>
            )}

            {/* Excel Bottom Totals Row */}
            {items.length > 0 && (
              <tr className="bg-slate-950 font-semibold border-t border-slate-700 text-slate-200 text-xs">
                <td className="pl-4 py-3 border-r border-slate-800" colSpan="3">
                  TOTALS
                </td>
                
                {/* Procured total */}
                <td className="py-3 text-center bg-primary-950/10 text-primary-400">{totals.procuredOn}</td>
                <td className="border-r border-slate-800 py-3 text-center bg-primary-950/10">{totals.procuredTo}</td>

                {/* Dist Cash total */}
                <td className="py-3 text-center text-blue-400">{totals.distCashOn}</td>
                <td className="border-r border-slate-800 py-3 text-center">{totals.distCashTo}</td>

                {/* Dist Loan total */}
                <td className="py-3 text-center bg-primary-950/10 text-indigo-400">{totals.distLoanOn}</td>
                <td className="border-r border-slate-800 py-3 text-center bg-primary-950/10">{totals.distLoanTo}</td>

                {/* Closing Stock balance total */}
                <td className="border-r border-slate-800 py-3 text-center text-teal-400 font-bold">{totals.balance}</td>

                {/* Cash Pay total */}
                <td className="py-3 text-center bg-primary-950/10 text-cyan-400">₹{totals.cashPayOn.toLocaleString()}</td>
                <td className="border-r border-slate-800 py-3 text-center bg-primary-950/10">₹{totals.cashPayTo.toLocaleString()}</td>

                {/* Loan Pay total */}
                <td className="py-3 text-center text-sky-400">₹{totals.loanPayOn.toLocaleString()}</td>
                <td className="border-r border-slate-800 py-3 text-center">₹{totals.loanPayTo.toLocaleString()}</td>

                {/* Paid & Outstanding totals */}
                <td className="py-3 text-center text-emerald-400 font-bold bg-emerald-950/10">₹{totals.totalPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="border-r border-slate-800 py-3 text-center text-amber-400 font-bold bg-emerald-950/10">₹{totals.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>

                <td className="py-3"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
