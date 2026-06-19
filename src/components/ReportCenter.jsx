import React, { useState, useEffect } from 'react';
import { X, Calendar, BarChart3, Receipt, FileSpreadsheet, Layers, Loader2 } from 'lucide-react';
import { reportsApi } from '../services/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function ReportCenter({ isOpen, onClose, activeDate }) {
  const [reportType, setReportType] = useState('weekly'); // weekly | monthly | yearly
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (reportType === 'weekly') {
        res = await reportsApi.getWeeklyReport(activeDate);
      } else if (reportType === 'monthly') {
        res = await reportsApi.getMonthlyReport(activeDate);
      } else {
        res = await reportsApi.getYearlyReport(activeDate);
      }
      setReportData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to generate report. Ensure database is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen, reportType, activeDate]);

  if (!isOpen) return null;

  // Format chart data
  const chartData = reportData?.items.map(item => ({
    name: item.inputName,
    procured: item.periodProcured,
    distributed: item.periodDistCash + item.periodDistLoan,
    revenue: item.periodExpectedRevenue,
    payments: item.periodTotalPayment,
    outstanding: item.closingOutstanding
  })) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-6xl h-[90vh] glass-modal p-6 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Decorative corner glows */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-400" />
              AgriSync Reconciliation Center
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Reconciliation calculations generated for active date: <span className="text-primary-300 font-semibold">{activeDate}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 shrink-0 border-b border-slate-800/60">
          <div className="flex gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {['weekly', 'monthly', 'yearly'].map((type) => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wider transition-all ${
                  reportType === type 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {reportData && (
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              Period: <span className="font-semibold text-slate-200">{reportData.range.start}</span> to <span className="font-semibold text-slate-200">{reportData.range.end}</span>
            </div>
          )}
        </div>

        {/* Main Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-5 space-y-8 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
              <p className="text-sm text-slate-400">Loading reconciliation data...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-xl text-center text-red-300">
              <p>{error}</p>
              <button 
                onClick={fetchReport} 
                className="mt-3 px-4 py-1.5 bg-red-800/40 hover:bg-red-800/60 border border-red-700/50 rounded-lg text-xs font-semibold text-white transition-all"
              >
                Retry Request
              </button>
            </div>
          ) : reportData ? (
            <>
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Opening Stock (Units)</p>
                  <h4 className="text-xl font-bold text-slate-200">{reportData.summary.totalOpeningBalance.toLocaleString()}</h4>
                </div>
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Closing Stock (Units)</p>
                  <h4 className="text-xl font-bold text-slate-200">{reportData.summary.totalClosingBalance.toLocaleString()}</h4>
                </div>
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sales Revenue (Period)</p>
                  <h4 className="text-xl font-bold text-blue-400">₹{reportData.summary.totalPeriodExpectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                </div>
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Closing Outstanding (Total)</p>
                  <h4 className="text-xl font-bold text-amber-400">₹{reportData.summary.totalClosingOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                </div>
              </div>

              {/* Charts Grid */}
              {chartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Stock Quantities Chart */}
                  <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-primary-400" />
                      Stock Quantity Flow (Units)
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                            labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                          <Bar name="Procured Qty" dataKey="procured" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar name="Distributed Qty" dataKey="distributed" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Financial Reconciliation Chart */}
                  <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-primary-400" />
                      Financial Reconciliation (INR)
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                            labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                            formatter={(value) => [`₹${Number(value).toLocaleString()}`]}
                          />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                          <Bar name="Sales Revenue" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar name="Payments Collected" dataKey="payments" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar name="Outstanding" dataKey="outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabular breakdown */}
              <div className="bg-slate-950/20 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900/40">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-primary-400" />
                    Itemized Reconciliation breakdown
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase">
                        <th className="pl-4 py-3">Agri Input Name</th>
                        <th className="py-3 text-center">Opening Stock</th>
                        <th className="py-3 text-center">Procured (Qty)</th>
                        <th className="py-3 text-center">Dist. Cash (Qty)</th>
                        <th className="py-3 text-center">Dist. Loan (Qty)</th>
                        <th className="py-3 text-center text-teal-400 font-bold">Closing Stock</th>
                        <th className="py-3 text-center text-blue-400">Sales Revenue</th>
                        <th className="py-3 text-center text-emerald-400">Payments Recv.</th>
                        <th className="py-3 text-center text-amber-400 pr-4">Outstanding (Closing)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {reportData.items.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-900/20">
                          <td className="pl-4 py-2.5 font-medium text-slate-200">{item.inputName} ({item.uom})</td>
                          <td className="py-2.5 text-center">{item.openingBalance}</td>
                          <td className="py-2.5 text-center text-emerald-400">{item.periodProcured}</td>
                          <td className="py-2.5 text-center">{item.periodDistCash}</td>
                          <td className="py-2.5 text-center">{item.periodDistLoan}</td>
                          <td className="py-2.5 text-center text-teal-400 font-semibold">{item.closingBalance}</td>
                          <td className="py-2.5 text-center font-semibold">₹{item.periodExpectedRevenue.toLocaleString()}</td>
                          <td className="py-2.5 text-center font-semibold text-emerald-400">₹{item.periodTotalPayment.toLocaleString()}</td>
                          <td className="py-2.5 text-center font-semibold text-amber-400 pr-4">₹{item.closingOutstanding.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center py-10 text-slate-500">No report generated.</p>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-all"
          >
            Close Report Center
          </button>
        </div>
      </div>
    </div>
  );
}
