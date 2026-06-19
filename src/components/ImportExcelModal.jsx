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
} from 'lucide-react';

// ─── Column Name Normalizer ─────────────────────────────────────────────────
// Strips spaces, parentheses, dashes, underscores, then lowercases for fuzzy matching
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

// ─── Core Calculation Engine ────────────────────────────────────────────────
const calculateRow = (rawRow) => {
  const inputName =
    getStrCol(rawRow, 'Agri Input Name', 'Input Name', 'Item Name', 'Name', 'AgriInput') ||
    'Unknown Item';
  const uom =
    getStrCol(rawRow, 'UOM', 'Unit', 'Unit of Measurement', 'Measurement') || '-';
  const salePrice = getCol(
    rawRow,
    'Sale Price (INR)', 'Sale Price', 'SalePrice(INR)', 'SalePrice', 'Price', 'Rate'
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

  // ── Auto-Calculations (Corrected Formulas) ──
  const balanceInFactory   = procuredToDate - (distCashToDate + distLoanToDate);
  const totalPaymentToDate = cashPayToDate + loanPayToDate;
  const totalPaymentOnDate = cashPayOnDate + loanPayOnDate;
  const outstandingAmount  = (procuredToDate * salePrice) - totalPaymentToDate;

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
    // internal helpers for dashboard
    _salePrice:       salePrice,
    _balance:         balanceInFactory,
    _totalPay:        totalPaymentToDate,
    _outstanding:     outstandingAmount,
    _expectedRevenue: (procuredToDate * salePrice),
  };
};

// ─── CSV Export helper ───────────────────────────────────────────────────────
const EXPORT_FIELDS = [
  'Agri Input Name', 'UOM', 'Sale Price (INR)',
  'Procured (On Date)', 'Procured (To Date)',
  'Distributed Cash (On Date)', 'Distributed Cash (To Date)',
  'Distributed Loan (On Date)', 'Distributed Loan (To Date)',
  'Balance In Factory',
  'Cash Payment (On Date)', 'Cash Payment (To Date)',
  'Loan Payment (On Date)', 'Loan Payment (To Date)',
  'Total Payment (On Date)', 'Total Payment (To Date)', 'Outstanding Amount (To Date)',
];

const exportAsCSV = (rows, filename) => {
  const csvRows = [
    EXPORT_FIELDS.join(','),
    ...rows.map((r) =>
      EXPORT_FIELDS.map((f) => {
        const val = r[f] ?? '';
        // Quote values that contain commas
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

const exportAsXLSX = (rows, filename) => {
  const exportRows = rows.map((r) => {
    const out = {};
    EXPORT_FIELDS.forEach((f) => { out[f] = r[f] ?? 0; });
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(exportRows, { header: EXPORT_FIELDS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'AgriSync');
  XLSX.writeFile(wb, filename);
};

// ─── Small stat card ─────────────────────────────────────────────────────────
const StatCard = ({ label, value, color }) => (
  <div className={`bg-slate-950/40 border rounded-xl p-3 ${color}`}>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
    <p className="text-lg font-bold text-slate-100">{value}</p>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ImportExcelModal({ isOpen, onClose }) {
  const [file, setFile]           = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [error, setError]         = useState('');
  const [dragging, setDragging]   = useState(false);
  const [parsing, setParsing]     = useState(false);
  const fileInputRef              = useRef(null);

  // ── File Parsing ───────────────────────────────────────────────────────────
  const parseFile = useCallback((selectedFile) => {
    setParsing(true);
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
          setError('The file appears to be empty. Please check the content.');
          setParsing(false);
          return;
        }

        setRawHeaders(Object.keys(jsonData[0]));
        const calculated = jsonData.map(calculateRow);
        setParsedData(calculated);
        setParsing(false);
      } catch (err) {
        setError('Could not parse the file. Ensure it is a valid .xlsx, .xls, or .csv file.');
        setParsing(false);
      }
    };

    reader.onerror = () => {
      setError('File read error. Please try again.');
      setParsing(false);
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
    parseFile(selectedFile);
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

  // ── Summary numbers ────────────────────────────────────────────────────────
  const summary = parsedData
    ? parsedData.reduce(
        (acc, r) => {
          acc.balance     += r._balance;
          acc.revenue     += r._expectedRevenue;  // This is now procured * sale price
          acc.paid        += r._totalPay;
          acc.outstanding += r._outstanding;
          return acc;
        },
        { balance: 0, revenue: 0, paid: 0, outstanding: 0 }
      )
    : null;

  const dateStamp = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[92vh] glass-modal p-0 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Decorative glows */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Import & Analyze Excel Sheet</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Upload your file — we auto-calculate Balance, Total Payment &amp; Outstanding Amount
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
                    ? 'border-primary-400 bg-primary-950/20 scale-[1.01]'
                    : 'border-slate-700 hover:border-blue-500 hover:bg-blue-950/10'
                  }`}
              >
                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-10 h-10 text-primary-400 animate-spin" />
                    <p className="text-slate-300 font-semibold">Parsing file…</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-500 group-hover:text-blue-400 mx-auto mb-4 transition-colors duration-200" />
                    <p className="text-slate-200 font-semibold text-base mb-1">
                      {file ? file.name : 'Drag & drop your Excel or CSV file here'}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {file ? 'Processing…' : 'or click to browse — supports .xlsx · .xls · .csv'}
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

              {/* Expected format hint */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  Expected Column Headers in Your Excel File
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
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
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-[10px] text-slate-400"
                    >
                      {col}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 items-center text-xs text-slate-600 border-t border-slate-800/60 pt-3">
                  <span>Auto-calculated columns:</span>
                  <span className="px-2 py-0.5 bg-teal-950/50 border border-teal-800/40 text-teal-400 rounded-full font-semibold">Balance In Factory</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="px-2 py-0.5 bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 rounded-full font-semibold">Total Payment</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="px-2 py-0.5 bg-blue-950/50 border border-blue-800/40 text-blue-400 rounded-full font-semibold">Expected Revenue</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="px-2 py-0.5 bg-amber-950/50 border border-amber-800/40 text-amber-400 rounded-full font-semibold">Outstanding Amount</span>
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
                    Parsed <strong>{parsedData.length} row{parsedData.length !== 1 ? 's' : ''}</strong> from{' '}
                    <strong className="text-white">{file?.name}</strong> — all calculations applied ✦
                  </span>
                </div>
                <button
                  onClick={resetAll}
                  className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 whitespace-nowrap"
                >
                  Upload different file
                </button>
              </div>

              {/* Columns detected */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mr-1">Detected columns:</span>
                {rawHeaders.map((h) => (
                  <span key={h} className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400 font-mono">
                    {h}
                  </span>
                ))}
              </div>

              {/* Summary KPI Cards */}
              {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    label="Total Balance In Factory"
                    value={summary.balance.toLocaleString()}
                    color="border-teal-800/40"
                  />
                  <StatCard
                    label="Expected Revenue"
                    value={`₹${summary.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    color="border-blue-800/40"
                  />
                  <StatCard
                    label="Total Payments"
                    value={`₹${summary.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    color="border-emerald-800/40"
                  />
                  <StatCard
                    label="Outstanding Amount"
                    value={`₹${summary.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    color={summary.outstanding > 0 ? 'border-amber-700/50' : 'border-slate-700'}
                  />
                </div>
              )}

              {/* Results Preview Table */}
              <div className="bg-slate-950/30 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-primary-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Calculated Results Preview
                  </h4>
                  <span className="ml-auto text-[10px] text-slate-600">
                    Columns marked ✦ are auto-calculated
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[38vh]">
                  <table className="w-full text-left text-xs min-w-[1200px]">
                    <thead className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="pl-4 py-3 text-slate-400">Agri Input</th>
                        <th className="py-3 text-slate-400">UOM</th>
                        <th className="py-3 text-center text-slate-400">Sale Price</th>
                        <th className="py-3 text-center text-primary-400">Proc. (On)</th>
                        <th className="py-3 text-center text-primary-300">Proc. (To)</th>
                        <th className="py-3 text-center text-blue-400">Dist. Cash (On)</th>
                        <th className="py-3 text-center text-blue-300">Dist. Cash (To)</th>
                        <th className="py-3 text-center text-indigo-400">Dist. Loan (On)</th>
                        <th className="py-3 text-center text-indigo-300">Dist. Loan (To)</th>
                        <th className="py-3 text-center text-teal-400 font-bold">Balance ✦</th>
                        <th className="py-3 text-center text-cyan-400">Cash Pay (On)</th>
                        <th className="py-3 text-center text-cyan-300">Cash Pay (To)</th>
                        <th className="py-3 text-center text-sky-400">Loan Pay (On)</th>
                        <th className="py-3 text-center text-sky-300">Loan Pay (To)</th>
                        <th className="py-3 text-center text-emerald-400 font-bold">Total Paid (On) ✦</th>
                        <th className="py-3 text-center text-emerald-400 font-bold">Total Paid (To) ✦</th>
                        <th className="py-3 text-center text-amber-400 font-bold pr-4">Outstanding ✦</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300">
                      {parsedData.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-900/20 transition-colors">
                          <td className="pl-4 py-2.5 font-medium text-slate-200 whitespace-nowrap">{row['Agri Input Name']}</td>
                          <td className="py-2.5 text-slate-400">{row['UOM']}</td>
                          <td className="py-2.5 text-center">₹{Number(row['Sale Price (INR)']).toLocaleString()}</td>
                          <td className="py-2.5 text-center text-primary-300">{row['Procured (On Date)']}</td>
                          <td className="py-2.5 text-center">{row['Procured (To Date)']}</td>
                          <td className="py-2.5 text-center text-blue-300">{row['Distributed Cash (On Date)']}</td>
                          <td className="py-2.5 text-center">{row['Distributed Cash (To Date)']}</td>
                          <td className="py-2.5 text-center text-indigo-300">{row['Distributed Loan (On Date)']}</td>
                          <td className="py-2.5 text-center">{row['Distributed Loan (To Date)']}</td>
                          <td className="py-2.5 text-center font-bold text-teal-400">{row['Balance In Factory']}</td>
                          <td className="py-2.5 text-center text-cyan-300">₹{Number(row['Cash Payment (On Date)']).toLocaleString()}</td>
                          <td className="py-2.5 text-center">₹{Number(row['Cash Payment (To Date)']).toLocaleString()}</td>
                          <td className="py-2.5 text-center text-sky-300">₹{Number(row['Loan Payment (On Date)']).toLocaleString()}</td>
                          <td className="py-2.5 text-center">₹{Number(row['Loan Payment (To Date)']).toLocaleString()}</td>
                          <td className="py-2.5 text-center font-bold text-emerald-400">
                            ₹{Number(row['Total Payment (On Date)']).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 text-center font-bold text-emerald-400">
                            ₹{Number(row['Total Payment (To Date)']).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`py-2.5 text-center font-bold pr-4 ${row._outstanding > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                            ₹{Number(row['Outstanding Amount (To Date)']).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Totals row */}
                    {parsedData.length > 1 && summary && (
                      <tfoot>
                        <tr className="bg-slate-950 border-t border-slate-700 text-[11px] font-bold text-slate-200 uppercase">
                          <td className="pl-4 py-3 text-slate-400" colSpan="9">TOTALS</td>
                          <td className="py-3 text-center text-teal-400">{summary.balance}</td>
                          <td colSpan="4" />
                          <td className="py-3 text-center text-emerald-400">
                            ₹{summary.paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 text-center text-emerald-400">
                            ₹{summary.paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 text-center text-amber-400 pr-4">
                            ₹{summary.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    )}
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
              ? '✦ Balance = Procured − Dist.Cash − Dist.Loan | Total Payment = Cash Pay + Loan Pay | Outstanding = Revenue − Total Payment'
              : 'File stays in your browser — nothing is uploaded to any server.'}
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
                    exportAsXLSX(parsedData, `AgriSync_Calculated_${dateStamp}.xlsx`)
                  }
                  className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-green-400" />
                  Export .xlsx
                </button>

                <button
                  onClick={() =>
                    exportAsCSV(parsedData, `AgriSync_Calculated_${dateStamp}.csv`)
                  }
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-500 active:scale-95 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-primary-500/25 transition-all flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
