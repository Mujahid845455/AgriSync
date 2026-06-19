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
  Zap,
  Brain,
  CheckSquare,
  Edit3,
} from 'lucide-react';

// ─── AI-Powered Smart Column Detection System ───────────────────────────────
const FIELD_MAPPINGS = {
  // Agri Input Name variations
  inputName: [
    'agri input name', 'input name', 'name of agri input', 'item name', 'product name', 
    'agricultural input', 'crop input', 'fertilizer name', 'seed name', 'pesticide name',
    'agri input', 'input', 'name', 'item', 'product', 'commodity', 'material'
  ],
  
  // UOM variations
  uom: [
    'uom', 'unit', 'unit of measurement', 'measurement unit', 'kg/ltr/nos', 'kg/litre/nos',
    'unit (kg/ltr/nos)', 'uom (kg/ltr/nos)', 'measurement', 'qty unit', 'packaging'
  ],
  
  // Sale Price variations
  salePrice: [
    'sale price', 'price', 'rate', 'unit price', 'sale price (inr)', 'sale rate',
    'sale price after subsidy', 'price after subsidy', 'selling price', 'cost', 'amount'
  ],
  
  // Procured variations
  procuredOnDate: [
    'procured (on date)', 'procured ondate', 'procured on date', 'procurement on date',
    'received on date', 'purchased on date', 'bought on date', 'procured today'
  ],
  procuredToDate: [
    'procured (to date)', 'procured todate', 'procured to date', 'procurement to date',
    'total procured', 'cumulative procured', 'received to date', 'purchased to date'
  ],
  
  // Distributed Cash variations  
  distributedCashOnDate: [
    'distributed against cash (on date)', 'distributed cash (on date)', 'cash distribution on date',
    'distributed against cash ondate', 'cash distributed on date', 'sold cash on date',
    'distributed cash ondate'
  ],
  distributedCashToDate: [
    'distributed against cash (to date)', 'distributed cash (to date)', 'cash distribution to date',
    'distributed against cash todate', 'total cash distribution', 'cash distributed to date',
    'distributed cash todate'
  ],
  
  // Distributed Loan variations
  distributedLoanOnDate: [
    'distributed against loan (on date)', 'distributed loan (on date)', 'loan distribution on date',
    'distributed against loan ondate', 'loan distributed on date', 'credit sale on date',
    'distributed loan ondate'
  ],
  distributedLoanToDate: [
    'distributed against loan (to date)', 'distributed loan (to date)', 'loan distribution to date', 
    'distributed against loan todate', 'total loan distribution', 'loan distributed to date',
    'distributed loan todate'
  ],
  
  // Cash Payment variations
  cashPaymentOnDate: [
    'payment status (cash) ondate', 'cash payment (on date)', 'cash payment ondate',
    'payment cash on date', 'cash received on date', 'cash collection on date'
  ],
  cashPaymentToDate: [
    'payment status (cash) todate', 'cash payment (to date)', 'cash payment todate',
    'payment cash to date', 'total cash payment', 'cash received to date'
  ],
  
  // Loan Payment variations  
  loanPaymentOnDate: [
    'payment status (loan) ondate', 'loan payment (on date)', 'loan payment ondate',
    'payment loan on date', 'loan received on date', 'credit payment on date'
  ],
  loanPaymentToDate: [
    'payment status (loan) todate', 'loan payment (to date)', 'loan payment todate',
    'payment loan to date', 'total loan payment', 'loan received to date'
  ]
};

// Enhanced fuzzy matching with AI logic
const normalize = (str) =>
  String(str || '')
    .toLowerCase()
    .replace(/[\s\(\)\-_\.\/\[\]]/g, '')
    .replace(/[0-9]/g, '')
    .trim();

// Smart similarity calculation
const calculateSimilarity = (str1, str2) => {
  const norm1 = normalize(str1);
  const norm2 = normalize(str2);
  
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;
  
  // Check for partial matches
  const words1 = norm1.split(/\s+/);
  const words2 = norm2.split(/\s+/);
  let matches = 0;
  
  words1.forEach(word1 => {
    words2.forEach(word2 => {
      if (word1.includes(word2) || word2.includes(word1)) matches++;
    });
  });
  
  return matches / Math.max(words1.length, words2.length);
};

// AI-powered field detection
const detectFieldMapping = (headers) => {
  const mappings = {};
  const usedHeaders = new Set();
  
  Object.entries(FIELD_MAPPINGS).forEach(([fieldKey, variations]) => {
    let bestMatch = null;
    let bestScore = 0;
    
    headers.forEach(header => {
      if (usedHeaders.has(header)) return;
      
      variations.forEach(variation => {
        const score = calculateSimilarity(header, variation);
        if (score > bestScore && score > 0.5) { // Threshold for acceptance
          bestScore = score;
          bestMatch = header;
        }
      });
    });
    
    if (bestMatch) {
      mappings[fieldKey] = bestMatch;
      usedHeaders.add(bestMatch);
    }
  });
  
  return mappings;
};
// Smart data extraction using detected mappings
const extractDataWithMapping = (row, mappings) => {
  const getField = (fieldKey) => {
    const headerName = mappings[fieldKey];
    if (!headerName || !row[headerName]) return 0;
    return Number(row[headerName]) || 0;
  };
  
  const getStringField = (fieldKey) => {
    const headerName = mappings[fieldKey];
    if (!headerName || !row[headerName]) return '';
    return String(row[headerName]).trim();
  };

  const inputName = getStringField('inputName') || 'Unknown Item';
  const uom = getStringField('uom') || '-';
  const salePrice = getField('salePrice');
  
  const procuredOnDate = getField('procuredOnDate');
  const procuredToDate = getField('procuredToDate');
  
  const distCashOnDate = getField('distributedCashOnDate');
  const distCashToDate = getField('distributedCashToDate');
  
  const distLoanOnDate = getField('distributedLoanOnDate');
  const distLoanToDate = getField('distributedLoanToDate');
  
  const cashPayOnDate = getField('cashPaymentOnDate');
  const cashPayToDate = getField('cashPaymentToDate');
  
  const loanPayOnDate = getField('loanPaymentOnDate');
  const loanPayToDate = getField('loanPaymentToDate');
  
  // Apply corrected formulas
  const balanceInFactory = procuredToDate - (distCashToDate + distLoanToDate);
  const totalPaymentOnDate = cashPayOnDate + loanPayOnDate;
  const totalPaymentToDate = cashPayToDate + loanPayToDate;
  const outstandingAmount = (procuredToDate * salePrice) - totalPaymentToDate;
  
  return {
    'Agri Input Name': inputName,
    'UOM': uom,
    'Sale Price (INR)': salePrice,
    'Procured (On Date)': procuredOnDate,
    'Procured (To Date)': procuredToDate,
    'Distributed Cash (On Date)': distCashOnDate,
    'Distributed Cash (To Date)': distCashToDate,
    'Distributed Loan (On Date)': distLoanOnDate,
    'Distributed Loan (To Date)': distLoanToDate,
    'Balance In Factory': balanceInFactory,
    'Cash Payment (On Date)': cashPayOnDate,
    'Cash Payment (To Date)': cashPayToDate,
    'Loan Payment (On Date)': loanPayOnDate,
    'Loan Payment (To Date)': loanPayToDate,
    'Total Payment (On Date)': totalPaymentOnDate,
    'Total Payment (To Date)': totalPaymentToDate,
    'Outstanding Amount (To Date)': outstandingAmount,
    // Internal helpers
    _inputName: inputName,
    _salePrice: salePrice,
    _balance: balanceInFactory,
    _totalPay: totalPaymentToDate,
    _outstanding: outstandingAmount
  };
};

// Field mapping component for manual corrections
const FieldMappingEditor = ({ headers, mappings, onMappingChange }) => {
  const expectedFields = [
    { key: 'inputName', label: 'Agri Input Name', required: true },
    { key: 'uom', label: 'UOM', required: false },
    { key: 'salePrice', label: 'Sale Price (INR)', required: true },
    { key: 'procuredOnDate', label: 'Procured (On Date)', required: false },
    { key: 'procuredToDate', label: 'Procured (To Date)', required: true },
    { key: 'distributedCashOnDate', label: 'Distributed Cash (On Date)', required: false },
    { key: 'distributedCashToDate', label: 'Distributed Cash (To Date)', required: false },
    { key: 'distributedLoanOnDate', label: 'Distributed Loan (On Date)', required: false },
    { key: 'distributedLoanToDate', label: 'Distributed Loan (To Date)', required: false },
    { key: 'cashPaymentOnDate', label: 'Cash Payment (On Date)', required: false },
    { key: 'cashPaymentToDate', label: 'Cash Payment (To Date)', required: false },
    { key: 'loanPaymentOnDate', label: 'Loan Payment (On Date)', required: false },
    { key: 'loanPaymentToDate', label: 'Loan Payment (To Date)', required: false }
  ];
  
  return (
    <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-4 space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-3">
        <Edit3 className="w-4 h-4 text-blue-400" />
        Smart Field Mapping (AI Detected)
      </h4>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {expectedFields.map(field => (
          <div key={field.key} className="flex items-center gap-2">
            <label className={`text-xs font-medium w-32 ${field.required ? 'text-slate-200' : 'text-slate-400'}`}>
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            
            <select
              value={mappings[field.key] || ''}
              onChange={(e) => onMappingChange(field.key, e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Select Column --</option>
              {headers.map(header => (
                <option key={header} value={header}>{header}</option>
              ))}
            </select>
            
            {mappings[field.key] && (
              <CheckSquare className="w-4 h-4 text-green-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
// CSV Export functions
const exportSmartCSV = (rows, filename) => {
  const fields = [
    'Agri Input Name', 'UOM', 'Sale Price (INR)',
    'Procured (On Date)', 'Procured (To Date)',
    'Distributed Cash (On Date)', 'Distributed Cash (To Date)',
    'Distributed Loan (On Date)', 'Distributed Loan (To Date)',
    'Balance In Factory',
    'Cash Payment (On Date)', 'Cash Payment (To Date)',
    'Loan Payment (On Date)', 'Loan Payment (To Date)',
    'Total Payment (On Date)', 'Total Payment (To Date)', 'Outstanding Amount (To Date)'
  ];
  
  const csvRows = [
    fields.join(','),
    ...rows.map((r) =>
      fields.map((f) => {
        const val = r[f] ?? '';
        return String(val).includes(',') ? `"${val}"` : val;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const exportSmartXLSX = (rows, filename) => {
  const fields = [
    'Agri Input Name', 'UOM', 'Sale Price (INR)',
    'Procured (On Date)', 'Procured (To Date)',
    'Distributed Cash (On Date)', 'Distributed Cash (To Date)',
    'Distributed Loan (On Date)', 'Distributed Loan (To Date)',
    'Balance In Factory',
    'Cash Payment (On Date)', 'Cash Payment (To Date)',
    'Loan Payment (On Date)', 'Loan Payment (To Date)',
    'Total Payment (On Date)', 'Total Payment (To Date)', 'Outstanding Amount (To Date)'
  ];
  
  const exportRows = rows.map((r) => {
    const out = {};
    fields.forEach((f) => { out[f] = r[f] ?? 0; });
    return out;
  });
  
  const ws = XLSX.utils.json_to_sheet(exportRows, { header: fields });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Smart Import');
  XLSX.writeFile(wb, filename);
};

// Main Smart Import Modal Component
export default function SmartImportModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [detectedMappings, setDetectedMappings] = useState({});
  const [manualMappings, setManualMappings] = useState({});
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showMappingEditor, setShowMappingEditor] = useState(false);
  const fileInputRef = useRef(null);

  // Smart file processing with AI detection
  const processFile = useCallback((selectedFile) => {
    setProcessing(true);
    setError('');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonData.length) {
          setError('The file appears to be empty. Please check the content.');
          setProcessing(false);
          return;
        }

        // Filter out empty rows
        const filteredData = jsonData.filter(row => 
          Object.values(row).some(value => value !== '' && value !== 0)
        );

        if (!filteredData.length) {
          setError('No valid data rows found. Please check your file format.');
          setProcessing(false);
          return;
        }

        const headers = Object.keys(filteredData[0]);
        setRawHeaders(headers);

        // AI-powered field detection
        const aiMappings = detectFieldMapping(headers);
        setDetectedMappings(aiMappings);
        setManualMappings(aiMappings);

        // Process data with detected mappings
        const processedData = filteredData.map(row => extractDataWithMapping(row, aiMappings));
        setParsedData(processedData);
        setProcessing(false);

        // Show mapping editor if mappings are incomplete
        const requiredFields = ['inputName', 'salePrice', 'procuredToDate'];
        const missingFields = requiredFields.filter(field => !aiMappings[field]);
        if (missingFields.length > 0) {
          setShowMappingEditor(true);
        }

      } catch (err) {
        console.error('Processing error:', err);
        setError('Could not process the file. Ensure it is a valid .xlsx, .xls, or .csv file.');
        setProcessing(false);
      }
    };

    reader.onerror = () => {
      setError('File read error. Please try again.');
      setProcessing(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  }, []);
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
    setShowMappingEditor(false);
    processFile(selectedFile);
  };

  const handleMappingChange = (fieldKey, headerName) => {
    const newMappings = { ...manualMappings };
    if (headerName) {
      newMappings[fieldKey] = headerName;
    } else {
      delete newMappings[fieldKey];
    }
    setManualMappings(newMappings);
  };

  const reprocessWithMappings = () => {
    if (!file) return;
    
    setProcessing(true);
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          
          const filteredData = jsonData.filter(row => 
            Object.values(row).some(value => value !== '' && value !== 0)
          );
          
          const processedData = filteredData.map(row => extractDataWithMapping(row, manualMappings));
          setParsedData(processedData);
          setProcessing(false);
          setShowMappingEditor(false);
        } catch (err) {
          setError('Error reprocessing data.');
          setProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }, 500);
  };

  const handleInputChange = (e) => handleFileSelect(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const resetAll = () => {
    setFile(null);
    setParsedData(null);
    setRawHeaders([]);
    setDetectedMappings({});
    setManualMappings({});
    setError('');
    setShowMappingEditor(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Calculate summary stats
  const summary = parsedData
    ? parsedData.reduce(
        (acc, r) => {
          acc.balance += r._balance || 0;
          acc.totalValue += (r['Procured (To Date)'] || 0) * (r._salePrice || 0);
          acc.paid += r._totalPay || 0;
          acc.outstanding += r._outstanding || 0;
          return acc;
        },
        { balance: 0, totalValue: 0, paid: 0, outstanding: 0 }
      )
    : null;

  const dateStamp = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-7xl max-h-[95vh] glass-modal p-0 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Decorative glows */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 border border-purple-500/30 rounded-xl">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">🤖 Smart AI Import - Auto Field Detection</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                AI automatically detects और maps करके किसी भी format का CSV/Excel import करे
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!parsedData ? (
            <div className="space-y-5">
              {/* Upload Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-200 group
                  ${dragging
                    ? 'border-purple-400 bg-purple-950/20 scale-[1.01]'
                    : 'border-slate-700 hover:border-purple-500 hover:bg-purple-950/10'
                  }`}
              >
                {processing ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <Brain className="w-12 h-12 text-purple-400 animate-pulse" />
                      <Zap className="w-6 h-6 text-yellow-400 absolute -top-1 -right-1 animate-bounce" />
                    </div>
                    <p className="text-slate-300 font-semibold">🤖 AI Processing File...</p>
                    <p className="text-slate-500 text-sm">Auto-detecting और mapping कर रहा है columns</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-purple-600/20 border border-purple-500/30 rounded-2xl">
                        <Brain className="w-12 h-12 text-purple-400" />
                      </div>
                    </div>
                    <p className="text-slate-200 font-semibold text-base mb-1">
                      {file ? `Processing: ${file.name}` : '🧠 Smart AI Import - Auto Field Detection'}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {file ? 'AI detecting fields...' : 'Upload any CSV/Excel - AI will auto-detect और map करेगा fields'}
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

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-2.5 p-4 bg-red-950/30 border border-red-800/50 rounded-xl text-red-300 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  {error}
                </div>
              )}

              {/* AI Features Showcase */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  🤖 AI Smart Features
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300 font-semibold">✨ Auto Column Detection:</p>
                    <ul className="text-xs text-slate-400 space-y-1 pl-4">
                      <li>• "Name of Agri input" → Agri Input Name</li>
                      <li>• "UOM (Kg/Ltr/Nos)" → UOM</li>
                      <li>• "Sale price after subsidy" → Sale Price</li>
                      <li>• "Procured Ondate/Todate" → Procured fields</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300 font-semibold">🎯 Smart Mapping:</p>
                    <ul className="text-xs text-slate-400 space-y-1 pl-4">
                      <li>• Fuzzy matching for similar names</li>
                      <li>• Manual correction option</li>
                      <li>• Auto-calculation of formulas</li>
                      <li>• Support for any format variation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Success Banner */}
              <div className="flex items-center justify-between p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl">
                <div className="flex items-center gap-2 text-purple-300 text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>
                    🤖 AI Successfully processed <strong>{parsedData.length} rows</strong> from{' '}
                    <strong className="text-white">{file?.name}</strong> with smart field mapping!
                  </span>
                </div>
                <button
                  onClick={resetAll}
                  className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 whitespace-nowrap"
                >
                  Process different file
                </button>
              </div>

              {/* AI Detection Results */}
              <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-3">
                  <Brain className="w-4 h-4 text-purple-400" />
                  🧠 AI Field Detection Results
                </h4>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {Object.entries(detectedMappings).map(([fieldKey, headerName]) => (
                    <div key={fieldKey} className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
                      <CheckSquare className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-slate-300">{headerName}</span>
                    </div>
                  ))}
                </div>
                
                {showMappingEditor && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <FieldMappingEditor 
                      headers={rawHeaders}
                      mappings={manualMappings}
                      onMappingChange={handleMappingChange}
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={reprocessWithMappings}
                        disabled={processing}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5"
                      >
                        {processing ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                        Reprocess with Corrections
                      </button>
                      <button
                        onClick={() => setShowMappingEditor(false)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                {!showMappingEditor && Object.keys(detectedMappings).length > 0 && (
                  <button
                    onClick={() => setShowMappingEditor(true)}
                    className="mt-3 text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2"
                  >
                    📝 Manual correction करना चाहते हैं mapping?
                  </button>
                )}
              </div>

              {/* Summary Cards */}
              {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-950/40 border border-teal-800/40 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Total Balance</p>
                    <p className="text-lg font-bold text-slate-100">{summary.balance.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950/40 border border-blue-800/40 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Total Value</p>
                    <p className="text-lg font-bold text-slate-100">₹{summary.totalValue.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950/40 border border-emerald-800/40 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Payments</p>
                    <p className="text-lg font-bold text-slate-100">₹{summary.paid.toLocaleString()}</p>
                  </div>
                  <div className={`bg-slate-950/40 border rounded-xl p-3 ${summary.outstanding > 0 ? 'border-amber-700/50' : 'border-slate-700'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Outstanding</p>
                    <p className={`text-lg font-bold ${summary.outstanding > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
                      ₹{summary.outstanding.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {/* Results Table */}
              <div className="bg-slate-950/30 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-purple-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Smart Processed Results
                  </h4>
                  <span className="ml-auto text-[10px] text-slate-600">
                    🤖 AI automatically mapped और calculated
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-left text-xs min-w-[1200px]">
                    <thead className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="pl-4 py-3 text-slate-400">Input Name</th>
                        <th className="py-3 text-center text-slate-400">UOM</th>
                        <th className="py-3 text-center text-slate-400">Price</th>
                        <th className="py-3 text-center text-primary-400">Proc. (On)</th>
                        <th className="py-3 text-center text-primary-300">Proc. (To)</th>
                        <th className="py-3 text-center text-blue-400">Cash (On)</th>
                        <th className="py-3 text-center text-blue-300">Cash (To)</th>
                        <th className="py-3 text-center text-indigo-400">Loan (On)</th>
                        <th className="py-3 text-center text-indigo-300">Loan (To)</th>
                        <th className="py-3 text-center text-teal-400 font-bold">Balance 🤖</th>
                        <th className="py-3 text-center text-amber-400 font-bold pr-4">Outstanding 🤖</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300">
                      {parsedData.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-900/20 transition-colors">
                          <td className="pl-4 py-2.5 font-medium text-slate-200 whitespace-nowrap max-w-[150px] truncate">
                            {row['Agri Input Name']}
                          </td>
                          <td className="py-2.5 text-center text-slate-400">{row['UOM']}</td>
                          <td className="py-2.5 text-center">₹{Number(row['Sale Price (INR)']).toLocaleString()}</td>
                          <td className="py-2.5 text-center text-primary-300">{row['Procured (On Date)']}</td>
                          <td className="py-2.5 text-center">{row['Procured (To Date)']}</td>
                          <td className="py-2.5 text-center text-blue-300">{row['Distributed Cash (On Date)']}</td>
                          <td className="py-2.5 text-center">{row['Distributed Cash (To Date)']}</td>
                          <td className="py-2.5 text-center text-indigo-300">{row['Distributed Loan (On Date)']}</td>
                          <td className="py-2.5 text-center">{row['Distributed Loan (To Date)']}</td>
                          <td className="py-2.5 text-center font-bold text-teal-400">{row['Balance In Factory']}</td>
                          <td className={`py-2.5 text-center font-bold pr-4 ${row._outstanding > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                            ₹{Number(row['Outstanding Amount (To Date)']).toLocaleString()}
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-600">
            {parsedData
              ? '🤖 AI automatically detected fields और calculated सभी formulas correctly'
              : '🧠 AI will smartly detect किसी भी format का CSV/Excel और auto-map करेगा fields'}
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
                    exportSmartXLSX(parsedData, `Smart_Import_${dateStamp}.xlsx`)
                  }
                  className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                  Export .xlsx
                </button>

                <button
                  onClick={() =>
                    exportSmartCSV(parsedData, `Smart_Import_${dateStamp}.csv`)
                  }
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  🤖 Export Smart CSV
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}