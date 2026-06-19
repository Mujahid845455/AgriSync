import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle,
  Table,
  RefreshCw,
  Info,
  ArrowRight,
  BarChart3,
  Calculator,
  TrendingUp,
  FileDown,
} from 'lucide-react';

// ─── Column Name Normalizer ─────────────────────────────────────────────────
const normalize = (str) =>
  String(str || '')
    .toLowerCase()
    .replace(/[\s\(\)\-_\.\/]/g, '');

// Flexible column reader — tries multiple alias keys
const getCol = (row, ...aliases) => {
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const n = normalize(alias);
    const match = rowKeys.find((k) => normalize(k) === n);
    if (match !== undefined) return Number(row[match]) || 0;
  }
  return 0;
};

const getStrCol = (row, ...aliases) => {
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const n = normalize(alias);
    const match = rowKeys.find((k) => normalize(k) === n);
    if (match !== undefined && row[match] !== undefined && row[match] !== '')
      return String(row[match]);
  }
  return '';
};

// ─── Enhanced Analysis Engine ────────────────────────────────────────────────
const analyzeAndCalculateRow = (rawRow) => {
  const inputName =
    getStrCol(rawRow, 'Agri Input Name', 'Input Name', 'Item Name', 'Name', 'AgriInput', 'Product') ||
    'Unknown Item';
  const uom =
    getStrCol(rawRow, 'UOM', 'Unit', 'Unit of Measurement', 'Measurement') || '-';
  const salePrice = getCol(
    rawRow,
    'Sale Price (INR)', 'Sale Price', 'SalePrice(INR)', 'SalePrice', 'Price', 'Rate', 'Unit Price'
  );

  const procuredOnDate = getCol(rawRow, 'Procured (On Date)', 'Procured (OnDate)', 'ProcuredOnDate', 'Proc On Date');
  const procuredToDate  = getCol(rawRow, 'Procured (To Date)', 'Procured (ToDate)', 'ProcuredToDate', 'Proc To Date');

  const distCashOnDate = getCol(rawRow, 'Distributed Cash (On Date)', 'Dist. Cash (On Date)', 'DistCash(OnDate)', 'DistCashOnDate');
  const distCashToDate = getCol(rawRow, 'Distributed Cash (To Date)', 'Dist. Cash (To Date)', 'DistCash(ToDate)', 'DistCashToDate');

  const distLoanOnDate = getCol(rawRow, 'Distributed Loan (On Date)', 'Dist. Loan (On Date)', 'DistLoan(OnDate)', 'DistLoanOnDate');
  const distLoanToDate = getCol(rawRow, 'Distributed Loan (To Date)', 'Dist. Loan (To Date)', 'DistLoan(ToDate)', 'DistLoanToDate');
  const cashPayOnDate = getCol(rawRow, 'Cash Payment (On Date)', 'CashPayment(OnDate)', 'CashPayOnDate', 'Cash Pay On');
  const cashPayToDate = getCol(rawRow, 'Cash Payment (To Date)', 'CashPayment(ToDate)', 'CashPayToDate', 'Cash Pay To');

  const loanPayOnDate = getCol(rawRow, 'Loan Payment (On Date)', 'LoanPayment(OnDate)', 'LoanPayOnDate', 'Loan Pay On');
  const loanPayToDate = getCol(rawRow, 'Loan Payment (To Date)', 'LoanPayment(ToDate)', 'LoanPayToDate', 'Loan Pay To');

  // ── Enhanced Auto-Calculations (Corrected Formulas) ──
  const balanceInFactory   = procuredToDate - (distCashToDate + distLoanToDate);
  const totalPaymentToDate = cashPayToDate + loanPayToDate;
  const totalPaymentOnDate = cashPayOnDate + loanPayOnDate;
  const outstandingAmount  = (procuredToDate * salePrice) - totalPaymentToDate;
  
  // ── NEW ANALYSIS FIELDS ──
  const totalDistributed   = distCashToDate + distLoanToDate;
  const inventoryTurnover  = totalDistributed > 0 ? (procuredToDate / totalDistributed).toFixed(2) : 0;
  const paymentEfficiency  = (procuredToDate * salePrice) > 0 ? ((totalPaymentToDate / (procuredToDate * salePrice)) * 100).toFixed(1) : 0;
  const profitMargin       = (procuredToDate * salePrice) > 0 ? (((totalDistributed * salePrice - (procuredToDate * (salePrice * 0.8))) / (totalDistributed * salePrice)) * 100).toFixed(1) : 0;
  const riskLevel          = outstandingAmount > ((procuredToDate * salePrice) * 0.3) ? 'High' : outstandingAmount > ((procuredToDate * salePrice) * 0.1) ? 'Medium' : 'Low';
  const stockStatus        = balanceInFactory < (procuredToDate * 0.1) ? 'Low Stock' : balanceInFactory > (procuredToDate * 0.8) ? 'Overstocked' : 'Normal';
  
  return {
    'Agri Input Name':              inputName,
    'UOM':                          uom,
    'Sale Price (INR)':             salePrice,
    'Procured (On Date)':           procuredOnDate,
    'Procured (To Date)':           procuredToDate,
    'Distributed Cash (On Date)':   distCashOnDate,
    'Distributed Cash (To Date)':   distCashToDate,
    'Distributed Loan (On Date)':   distLoanOnDate,
    'Distributed Loan (To Date)':   distLoanToDate,
    'Balance In Factory':           balanceInFactory,
    'Cash Payment (On Date)':       cashPayOnDate,
    'Cash Payment (To Date)':       cashPayToDate,
    'Loan Payment (On Date)':       loanPayOnDate,
    'Loan Payment (To Date)':       loanPayToDate,
    'Total Payment (On Date)':      totalPaymentOnDate,
    'Total Payment (To Date)':      totalPaymentToDate,
    'Outstanding Amount (To Date)': outstandingAmount,
    // ── NEW ANALYSIS COLUMNS ──
    'Total Distributed':            totalDistributed,
    'Inventory Turnover Ratio':     inventoryTurnover,
    'Payment Efficiency (%)':       paymentEfficiency,
    'Estimated Profit Margin (%)':  profitMargin,
    'Risk Level':                   riskLevel,
    'Stock Status':                 stockStatus,
    // internal helpers for dashboard
    _salePrice:       salePrice,
    _balance:         balanceInFactory,
    _totalPay:        totalPaymentToDate,
    _outstanding:     outstandingAmount,
    _expectedRevenue: (procuredToDate * salePrice),
    _totalDistributed: totalDistributed,
    _inventoryTurnover: parseFloat(inventoryTurnover),
    _paymentEfficiency: parseFloat(paymentEfficiency),
    _profitMargin: parseFloat(profitMargin),
  };
};
// ─── Enhanced CSV/Excel Export with Analysis ─────────────────────────────────
const ANALYSIS_EXPORT_FIELDS = [
  'Agri Input Name', 'UOM', 'Sale Price (INR)',
  'Procured (On Date)', 'Procured (To Date)',
  'Distributed Cash (On Date)', 'Distributed Cash (To Date)',
  'Distributed Loan (On Date)', 'Distributed Loan (To Date)',
  'Balance In Factory', 'Total Distributed',
  'Cash Payment (On Date)', 'Cash Payment (To Date)',
  'Loan Payment (On Date)', 'Loan Payment (To Date)',
  'Total Payment (On Date)', 'Total Payment (To Date)', 'Outstanding Amount (To Date)',
  'Inventory Turnover Ratio', 'Payment Efficiency (%)', 'Estimated Profit Margin (%)',
  'Risk Level', 'Stock Status',
];

const exportAnalysisAsCSV = (rows, filename) => {
  const csvRows = [
    ANALYSIS_EXPORT_FIELDS.join(','),
    ...rows.map((r) =>
      ANALYSIS_EXPORT_FIELDS.map((f) => {
        const val = r[f] ?? '';
        return String(val).includes(',') ? `"${val}"` : val;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const exportAnalysisAsXLSX = (rows, filename) => {
  const exportRows = rows.map((r) => {
    const out = {};
    ANALYSIS_EXPORT_FIELDS.forEach((f) => { out[f] = r[f] ?? 0; });
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(exportRows, { header: ANALYSIS_EXPORT_FIELDS });
  
  // Enhanced styling for analysis columns
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell_address]) continue;
      
      // Style analysis columns differently
      const colName = ANALYSIS_EXPORT_FIELDS[C];
      if (['Risk Level', 'Stock Status'].includes(colName)) {
        ws[cell_address].s = { 
          font: { bold: true }, 
          fill: { fgColor: { rgb: "FFFF99" } }
        };
      }
    }
  }
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'AgriSync Analysis');
  XLSX.writeFile(wb, filename);
};
// ─── Analysis Summary Card ───────────────────────────────────────────────────
const AnalysisCard = ({ label, value, color, icon: Icon, subtitle }) => (
  <div className={`bg-slate-950/40 border rounded-xl p-3 ${color} relative overflow-hidden`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
        <p className="text-lg font-bold text-slate-100">{value}</p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
      {Icon && (
        <div className="p-1.5 bg-white/10 rounded-lg">
          <Icon className="w-4 h-4 text-slate-300" />
        </div>
      )}
    </div>
    <div className="absolute -top-2 -right-2 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl" />
  </div>
);

// ─── Main Excel Analysis Component ─────────────────────────────────────────────
export default function ExcelAnalysisModal({ isOpen, onClose }) {
  const [file, setFile]           = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [error, setError]         = useState('');
  const [dragging, setDragging]   = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef              = useRef(null);

  // ── File Analysis ─────────────────────────────────────────────────────────────
  const analyzeFile = useCallback((selectedFile) => {
    setAnalyzing(true);
    setError('');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData  = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData.length) {
          setError('The Excel file appears to be empty. Please check the content and try again.');
          setAnalyzing(false);
          return;
        }

        setRawHeaders(Object.keys(jsonData[0]));
        const analyzed = jsonData.map(analyzeAndCalculateRow);
        setParsedData(analyzed);
        setAnalyzing(false);
      } catch (err) {
        console.error('Analysis error:', err);
        setError('Could not analyze the file. Ensure it is a valid .xlsx, .xls, or .csv file with proper column headers.');
        setAnalyzing(false);
      }
    };

    reader.onerror = () => {
      setError('File read error. Please try again.');
      setAnalyzing(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  }, []);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Unsupported file type. Please upload .xlsx, .xls, or .csv files only.');
      return;
    }
    setFile(selectedFile);
    setParsedData(null);
    setError('');
    analyzeFile(selectedFile);
  };

  const handleInputChange  = (e) => handleFileSelect(e.target.files[0]);
  const handleDrop         = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const resetAll = () => {
    setFile(null);
    setParsedData(null);
    setRawHeaders([]);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  // ── Enhanced Analysis Summary ─────────────────────────────────────────────────
  const analysisMetrics = parsedData
    ? parsedData.reduce(
        (acc, r) => {
          acc.totalBalance     += r._balance;
          acc.totalRevenue     += r._expectedRevenue;
          acc.totalPaid        += r._totalPay;
          acc.totalOutstanding += r._outstanding;
          acc.avgTurnover      += r._inventoryTurnover;
          acc.avgPaymentEff    += r._paymentEfficiency;
          acc.avgProfitMargin  += r._profitMargin;
          
          // Risk analysis
          if (r['Risk Level'] === 'High') acc.highRiskCount++;
          else if (r['Risk Level'] === 'Medium') acc.mediumRiskCount++;
          
          // Stock analysis
          if (r['Stock Status'] === 'Low Stock') acc.lowStockCount++;
          else if (r['Stock Status'] === 'Overstocked') acc.overstockedCount++;
          
          return acc;
        },
        { 
          totalBalance: 0, totalRevenue: 0, totalPaid: 0, totalOutstanding: 0,
          avgTurnover: 0, avgPaymentEff: 0, avgProfitMargin: 0,
          highRiskCount: 0, mediumRiskCount: 0, lowStockCount: 0, overstockedCount: 0
        }
      )
    : null;

  // Calculate averages
  if (analysisMetrics && parsedData.length > 0) {
    analysisMetrics.avgTurnover = (analysisMetrics.avgTurnover / parsedData.length).toFixed(2);
    analysisMetrics.avgPaymentEff = (analysisMetrics.avgPaymentEff / parsedData.length).toFixed(1);
    analysisMetrics.avgProfitMargin = (analysisMetrics.avgProfitMargin / parsedData.length).toFixed(1);
  }

  const dateStamp = new Date().toISOString().split('T')[0];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-7xl max-h-[95vh] glass-modal p-0 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Decorative glows */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 border border-emerald-500/30 rounded-xl">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Advanced Excel Analysis & Export Center</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Upload your Excel file → Get enhanced analysis with new metrics → Export updated CSV/Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Upload zone / file info row */}
          {!parsedData ? (
            <div className="space-y-5">
              {/* Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-200 group
                  ${dragging
                    ? 'border-emerald-400 bg-emerald-950/20 scale-[1.01]'
                    : 'border-slate-700 hover:border-emerald-500 hover:bg-emerald-950/10'
                  }`}
              >
                {analyzing ? (
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
                    <p className="text-slate-300 font-semibold">Analyzing Excel data...</p>
                    <p className="text-slate-500 text-sm">Calculating advanced metrics & insights</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-emerald-600/20 border border-emerald-500/30 rounded-2xl">
                        <Calculator className="w-12 h-12 text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-slate-200 font-semibold text-base mb-1">
                      {file ? file.name : 'Upload Excel file for Advanced Analysis'}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {file ? 'Processing & analyzing...' : 'Drag & drop or click to browse — supports .xlsx · .xls · .csv'}
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleInputChange}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-4 bg-red-950/30 border border-red-800/50 rounded-xl text-red-300 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  {error}
                </div>
              )}
              {/* Expected format and new features hint */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  NEW Analysis Features Added
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300 font-semibold">📊 Enhanced Calculations:</p>
                    <ul className="text-xs text-slate-400 space-y-1 pl-4">
                      <li>• Total Distributed (Cash + Loan)</li>
                      <li>• Inventory Turnover Ratio</li>
                      <li>• Payment Efficiency Percentage</li>
                      <li>• Estimated Profit Margin</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300 font-semibold">🎯 Smart Analysis:</p>
                    <ul className="text-xs text-slate-400 space-y-1 pl-4">
                      <li>• Risk Level Assessment (High/Medium/Low)</li>
                      <li>• Stock Status Classification</li>
                      <li>• Performance Insights</li>
                      <li>• Export with Enhanced Data</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-3">
                  <p className="text-[11px] text-slate-600 mb-2">Expected Excel columns (same as before):</p>
                  <div className="grid grid-cols-3 lg:grid-cols-5 gap-1">
                    {[
                      'Agri Input Name', 'UOM', 'Sale Price (INR)',
                      'Procured (On Date)', 'Procured (To Date)',
                      'Distributed Cash (On Date)', 'Distributed Cash (To Date)',
                      'Distributed Loan (On Date)', 'Distributed Loan (To Date)',
                      'Cash Payment (On Date)', 'Cash Payment (To Date)',
                      'Loan Payment (On Date)', 'Loan Payment (To Date)',
                    ].map((col) => (
                      <span
                        key={col}
                        className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 font-mono text-[9px] text-slate-400"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Success banner */}
              <div className="flex items-center justify-between p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-300 text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Analyzed <strong>{parsedData.length} row{parsedData.length !== 1 ? 's' : ''}</strong> from{' '}
                    <strong className="text-white">{file?.name}</strong> — Enhanced calculations applied ✨
                  </span>
                </div>
                <button
                  onClick={resetAll}
                  className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 whitespace-nowrap"
                >
                  Analyze different file
                </button>
              </div>

              {/* Columns detected */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mr-1">Original columns:</span>
                {rawHeaders.slice(0, 8).map((h) => (
                  <span key={h} className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400 font-mono">
                    {h}
                  </span>
                ))}
                {rawHeaders.length > 8 && (
                  <span className="text-[10px] text-slate-600">+{rawHeaders.length - 8} more...</span>
                )}
              </div>

              {/* Enhanced Analysis KPI Cards */}
              {analysisMetrics && (
                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                    Analysis Summary
                  </h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <AnalysisCard
                      label="Total Outstanding"
                      value={`₹${analysisMetrics.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                      color="border-amber-800/40"
                      icon={AlertTriangle}
                      subtitle={analysisMetrics.totalOutstanding > 0 ? `${analysisMetrics.highRiskCount} high risk items` : 'All payments current'}
                    />
                    <AnalysisCard
                      label="Avg Inventory Turnover"
                      value={`${analysisMetrics.avgTurnover}x`}
                      color="border-blue-800/40"
                      icon={TrendingUp}
                      subtitle={parseFloat(analysisMetrics.avgTurnover) > 2 ? 'Good velocity' : 'Slow moving'}
                    />
                    <AnalysisCard
                      label="Payment Efficiency"
                      value={`${analysisMetrics.avgPaymentEff}%`}
                      color="border-emerald-800/40"
                      icon={CheckCircle}
                      subtitle={parseFloat(analysisMetrics.avgPaymentEff) > 80 ? 'Excellent' : 'Needs attention'}
                    />
                    <AnalysisCard
                      label="Stock Issues"
                      value={`${analysisMetrics.lowStockCount + analysisMetrics.overstockedCount}`}
                      color="border-red-800/40"
                      icon={AlertTriangle}
                      subtitle={`${analysisMetrics.lowStockCount} low, ${analysisMetrics.overstockedCount} excess`}
                    />
                  </div>
                  {/* Performance Indicators Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Risk Distribution</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-red-400">High Risk</span>
                          <span className="text-slate-300">{analysisMetrics.highRiskCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-amber-400">Medium Risk</span>
                          <span className="text-slate-300">{analysisMetrics.mediumRiskCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-400">Low Risk</span>
                          <span className="text-slate-300">{parsedData.length - analysisMetrics.highRiskCount - analysisMetrics.mediumRiskCount}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Financial Health</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Total Revenue</span>
                          <span className="text-emerald-400">₹{analysisMetrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Collected</span>
                          <span className="text-blue-400">₹{analysisMetrics.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Avg Profit Margin</span>
                          <span className="text-purple-400">{analysisMetrics.avgProfitMargin}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Inventory Status</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-red-400">Low Stock</span>
                          <span className="text-slate-300">{analysisMetrics.lowStockCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-amber-400">Overstocked</span>
                          <span className="text-slate-300">{analysisMetrics.overstockedCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-400">Normal</span>
                          <span className="text-slate-300">{parsedData.length - analysisMetrics.lowStockCount - analysisMetrics.overstockedCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Enhanced Results Preview Table */}
              <div className="bg-slate-950/30 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Enhanced Analysis Results Preview
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-600">
                    Columns marked ✨ are newly calculated analytics
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-left text-xs min-w-[1600px]">
                    <thead className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="pl-4 py-3 text-slate-400">Input Name</th>
                        <th className="py-3 text-center text-slate-400">UOM</th>
                        <th className="py-3 text-center text-slate-400">Price</th>
                        <th className="py-3 text-center text-teal-400">Balance</th>
                        <th className="py-3 text-center text-emerald-400">Revenue</th>
                        <th className="py-3 text-center text-amber-400">Outstanding</th>
                        <th className="py-3 text-center text-purple-400 font-bold">Total Dist. ✨</th>
                        <th className="py-3 text-center text-blue-400 font-bold">Turnover ✨</th>
                        <th className="py-3 text-center text-cyan-400 font-bold">Pay. Eff. ✨</th>
                        <th className="py-3 text-center text-indigo-400 font-bold">Profit % ✨</th>
                        <th className="py-3 text-center text-red-400 font-bold">Risk ✨</th>
                        <th className="py-3 text-center text-orange-400 font-bold pr-4">Stock Status ✨</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300">
                      {parsedData.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-900/20 transition-colors">
                          <td className="pl-4 py-2.5 font-medium text-slate-200 whitespace-nowrap max-w-[120px] truncate">
                            {row['Agri Input Name']}
                          </td>
                          <td className="py-2.5 text-center text-slate-400">{row['UOM']}</td>
                          <td className="py-2.5 text-center">₹{Number(row['Sale Price (INR)']).toLocaleString()}</td>
                          <td className="py-2.5 text-center text-teal-400">{row['Balance In Factory']}</td>
                          <td className="py-2.5 text-center text-emerald-400">
                            ₹{Number(row['Expected Revenue (To Date)']).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                          </td>
                          <td className={`py-2.5 text-center ${row._outstanding > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                            ₹{Number(row['Outstanding Amount (To Date)']).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                          </td>
                          <td className="py-2.5 text-center font-bold text-purple-400">{row['Total Distributed']}</td>
                          <td className="py-2.5 text-center font-bold text-blue-400">{row['Inventory Turnover Ratio']}x</td>
                          <td className="py-2.5 text-center font-bold text-cyan-400">{row['Payment Efficiency (%)']}%</td>
                          <td className="py-2.5 text-center font-bold text-indigo-400">{row['Estimated Profit Margin (%)']}%</td>
                          <td className={`py-2.5 text-center font-bold ${
                            row['Risk Level'] === 'High' ? 'text-red-400' : 
                            row['Risk Level'] === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {row['Risk Level']}
                          </td>
                          <td className={`py-2.5 text-center font-bold pr-4 ${
                            row['Stock Status'] === 'Low Stock' ? 'text-red-400' : 
                            row['Stock Status'] === 'Overstocked' ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {row['Stock Status']}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-600">
            {parsedData
              ? '✨ Enhanced with: Risk Analysis, Stock Status, Performance Metrics, Profit Margins & More'
              : 'Upload your Excel file to get advanced inventory analysis with new calculated metrics.'}
          </p>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-all"
            >
              Close
            </button>

            {parsedData && (
              <>
                <button
                  onClick={() =>
                    exportAnalysisAsXLSX(parsedData, `AgriSync_Enhanced_Analysis_${dateStamp}.xlsx`)
                  }
                  className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Export Enhanced .xlsx
                </button>

                <button
                  onClick={() =>
                    exportAnalysisAsCSV(parsedData, `AgriSync_Enhanced_Analysis_${dateStamp}.csv`)
                  }
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-1.5"
                >
                  <FileDown className="w-4 h-4" />
                  Export Enhanced CSV
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}