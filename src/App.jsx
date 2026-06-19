import React, { useState, useEffect } from 'react';
import { 
  Wheat, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Download, 
  BarChart3, 
  Plus, 
  Database,
  RefreshCw,
  Clock,
  FileSpreadsheet,
  Brain
} from 'lucide-react';
import { inventoryApi, reportsApi } from './services/api';
import Dashboard from './components/Dashboard';
import InventoryTable from './components/InventoryTable';
import AddInputModal from './components/AddInputModal';
import ReportCenter from './components/ReportCenter';
import ImportExcelModal from './components/ImportExcelModal';
import ExcelAnalysisModal from './components/ExcelAnalysisModal';
import SmartImportModal from './components/SmartImportModal';
import confetti from 'canvas-confetti';

export default function App() {
  const [activeDate, setActiveDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [items, setItems] = useState([]);
  const [dbConnected, setDbConnected] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Track unsaved changes
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [cellChanges, setCellChanges] = useState({}); // { [itemId]: { procured, distributedCash, ... } }
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);

  // Helper to load inventory data
  const loadInventory = async (dateStr) => {
    setLoading(true);
    try {
      const res = await inventoryApi.getInventory(dateStr);
      setItems(res.data);
      setDbConnected(true);
      setCellChanges({});
      setUnsavedChanges(false);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setDbConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory(activeDate);
  }, [activeDate]);

  // Check backend server status
  const checkHealth = async () => {
    try {
      await inventoryApi.getInventory(activeDate);
      setDbConnected(true);
      loadInventory(activeDate);
    } catch (err) {
      setDbConnected(false);
    }
  };

  // Date shifting helpers
  const handlePrevDay = () => {
    if (unsavedChanges && !confirm('You have unsaved changes. Discard and change date?')) return;
    const date = new Date(activeDate);
    date.setDate(date.getDate() - 1);
    setActiveDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    if (unsavedChanges && !confirm('You have unsaved changes. Discard and change date?')) return;
    const date = new Date(activeDate);
    date.setDate(date.getDate() + 1);
    setActiveDate(date.toISOString().split('T')[0]);
  };

  const handleDateChange = (e) => {
    if (unsavedChanges && !confirm('You have unsaved changes. Discard and change date?')) return;
    setActiveDate(e.target.value);
  };

  // Real-time calculation engine for spreadsheet-like feeling
  const handleCellChange = (itemId, field, value) => {
    setUnsavedChanges(true);
    const qty = value === '' ? 0 : Number(value);

    // Save change description in cellChanges state
    setCellChanges(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: qty
      }
    }));

    // Update items array dynamically to trigger live visual re-calculations
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item._id !== itemId) return item;

        const updatedItem = { ...item };
        
        // Calculate "before" accumulated value (toDate - onDate)
        const currentOnDate = item[field]?.onDate || 0;
        const currentToDate = item[field]?.toDate || 0;
        const beforeVal = currentToDate - currentOnDate;

        // Update the specific field values
        updatedItem[field] = {
          onDate: qty,
          toDate: beforeVal + qty
        };

        // Recalculate computed properties
        const procuredTo = updatedItem.procured?.toDate || 0;
        const distCashTo = updatedItem.distributedCash?.toDate || 0;
        const distLoanTo = updatedItem.distributedLoan?.toDate || 0;
        const cashPayTo = updatedItem.cashPayment?.toDate || 0;
        const loanPayTo = updatedItem.loanPayment?.toDate || 0;

        updatedItem.balance = procuredTo - (distCashTo + distLoanTo);
        updatedItem.totalPayment = cashPayTo + loanPayTo;

        updatedItem.outstandingAmount = (procuredTo * updatedItem.salePrice) - updatedItem.totalPayment;

        return updatedItem;
      });
    });
  };

  // Bulk Save cell changes
  const handleSaveAll = async () => {
    if (Object.keys(cellChanges).length === 0) return;
    
    setSaving(true);
    try {
      const updates = Object.entries(cellChanges).map(([itemId, fields]) => ({
        itemId,
        ...fields
      }));

      await inventoryApi.saveTransactions(activeDate, updates);
      
      // Beautiful success confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#3b82f6', '#6366f1']
      });

      await loadInventory(activeDate);
    } catch (err) {
      alert('Failed to save transactions. Ensure backend and DB are active.');
    } finally {
      setSaving(false);
    }
  };

  // Add a new Agricultural Input
  const handleAddInput = async (data) => {
    try {
      await inventoryApi.createInput(data);
      loadInventory(activeDate);
    } catch (err) {
      alert('Failed to create new agri input.');
    }
  };

  // Update Agri Input Metadata
  const handleUpdateMetadata = async (id, data) => {
    try {
      await inventoryApi.updateInput(id, data);
      loadInventory(activeDate);
    } catch (err) {
      alert('Failed to update input details.');
    }
  };

  // Delete Agri Input Row
  const handleDeleteInput = async (id) => {
    try {
      await inventoryApi.deleteInput(id);
      loadInventory(activeDate);
    } catch (err) {
      alert('Failed to delete input.');
    }
  };

  // Export current table view as CSV
  const handleExportCSV = () => {
    const downloadUrl = reportsApi.getCSVDownloadUrl(activeDate);
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="min-h-screen pb-12 relative">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[10%] left-[5%] w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[5%] w-[450px] h-[450px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Database Status Alert Banner */}
      {!dbConnected && (
        <div className="bg-red-950/40 border-b border-red-800/40 text-red-300 px-4 py-3 text-sm flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-red-400 animate-pulse" />
            <span>
              <strong>Database Connection Offline.</strong> Running in mock/offline view mode. Ensure MongoDB is active locally.
            </span>
          </div>
          <button 
            onClick={checkHealth}
            className="flex items-center gap-1 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 rounded px-2.5 py-1 text-xs font-semibold text-white transition-all active:scale-95"
          >
            <RefreshCw className="w-3 h-3" />
            Reconnect
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-600 rounded-xl shadow-lg shadow-primary-500/20">
              <Wheat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                AgriSync
                <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-950 border border-primary-800 text-primary-400 rounded-full">v1.1</span>
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">Agricultural Inventory & Account Reconciliation Management</p>
            </div>
          </div>

          {/* Date Picker Controls */}
          <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 p-1.5 rounded-xl self-stretch sm:self-auto justify-between sm:justify-start">
            <button 
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="relative flex items-center gap-1.5 px-2">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={activeDate}
                onChange={handleDateChange}
                className="bg-transparent border-0 text-slate-200 text-xs font-semibold focus:outline-none focus:ring-0 w-[115px]"
              />
            </div>

            <button 
              onClick={handleNextDay}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dashboard Card Section */}
        <Dashboard items={items} />

        {/* Action Panel & Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Time Travel Active: Daily totals dynamically calculated based on calendar date.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-primary-400" />
              Add Agri Input
            </button>

            <button
              onClick={() => setIsSmartImportOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 border border-purple-800/50 hover:bg-purple-950/40 rounded-lg text-xs font-semibold text-slate-200 hover:text-purple-200 transition-all flex items-center justify-center gap-1.5"
            >
              <Brain className="w-4 h-4 text-purple-400" />
              🤖 Smart Import
            </button>

            <button
              onClick={() => setIsImportOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 border border-blue-800/50 hover:bg-blue-950/40 rounded-lg text-xs font-semibold text-slate-200 hover:text-blue-200 transition-all flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              Import Excel
            </button>

            <button
              onClick={() => setIsAnalysisOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 border border-emerald-800/50 hover:bg-emerald-950/40 rounded-lg text-xs font-semibold text-slate-200 hover:text-emerald-200 transition-all flex items-center justify-center gap-1.5"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              Excel Analysis
            </button>

            <button
              onClick={() => setIsReportOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Report Center
            </button>

            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4 text-blue-400" />
              Export CSV
            </button>

            <button
              onClick={handleSaveAll}
              disabled={!unsavedChanges || saving}
              className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-semibold shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                unsavedChanges 
                  ? 'bg-primary-600 hover:bg-primary-500 text-white hover:shadow-primary-500/20 active:scale-95' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800/80 shadow-none'
              }`}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Main Editable Grid Section */}
        {loading ? (
          <div className="glass-card py-24 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="text-sm text-slate-500">Loading daily ledger sheet...</p>
          </div>
        ) : (
          <InventoryTable 
            items={items} 
            onSaveCellChange={handleCellChange}
            onUpdateMetadata={handleUpdateMetadata}
            onDeleteItem={handleDeleteInput}
            hasUnsavedChanges={unsavedChanges}
          />
        )}
      </div>

      {/* Slide-over Modals */}
      <AddInputModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onAdd={handleAddInput} 
      />

      <ReportCenter 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        activeDate={activeDate} 
      />

      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
      />

      <ImportExcelModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <ExcelAnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
      />
    </div>
  );
}
