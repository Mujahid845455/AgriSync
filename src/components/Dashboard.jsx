import React from 'react';
import { 
  Boxes, 
  ArrowUpRight, 
  BadgeIndianRupee, 
  TrendingUp, 
  AlertTriangle,
  Wallet
} from 'lucide-react';

export default function Dashboard({ items }) {
  // Aggregate stats across all items
  const aggregates = items.reduce((acc, item) => {
    acc.totalProcured += item.procured?.toDate || 0;
    acc.procuredOnDate += item.procured?.onDate || 0;
    
    acc.totalDistributed += (item.distributedCash?.toDate || 0) + (item.distributedLoan?.toDate || 0);
    acc.distributedOnDate += (item.distributedCash?.onDate || 0) + (item.distributedLoan?.onDate || 0);
    
    acc.totalBalance += item.balance || 0;
    
    // Revenue calculations (Updated to match new formula)
    const procuredToDate = item.procured?.toDate || 0;
    acc.expectedRevenue += procuredToDate * item.salePrice;
    
    acc.totalPayments += item.totalPayment || 0;
    acc.outstandingAmount += item.outstandingAmount || 0;
    
    return acc;
  }, {
    totalProcured: 0,
    procuredOnDate: 0,
    totalDistributed: 0,
    distributedOnDate: 0,
    totalBalance: 0,
    expectedRevenue: 0,
    totalPayments: 0,
    outstandingAmount: 0
  });

  const cards = [
    {
      title: 'Balance in Factory',
      value: `${aggregates.totalBalance.toLocaleString()}`,
      subtext: `Total Procured: ${aggregates.totalProcured.toLocaleString()}`,
      icon: Boxes,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    },
    {
      title: 'Expected Revenue',
      value: `₹${aggregates.expectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtext: `Sales: ${aggregates.totalDistributed.toLocaleString()} units`,
      icon: TrendingUp,
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
    },
    {
      title: 'Payments Collected',
      value: `₹${aggregates.totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtext: `${((aggregates.expectedRevenue > 0 ? (aggregates.totalPayments / aggregates.expectedRevenue) * 100 : 0)).toFixed(1)}% recovery rate`,
      icon: Wallet,
      color: 'from-cyan-500/20 to-sky-500/10 border-cyan-500/30 text-cyan-400',
    },
    {
      title: 'Outstanding Amount',
      value: `₹${aggregates.outstandingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtext: aggregates.outstandingAmount > 0 ? 'Action required for collection' : 'Healthy account balance',
      icon: aggregates.outstandingAmount > 0 ? AlertTriangle : BadgeIndianRupee,
      color: aggregates.outstandingAmount > 0 
        ? 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400 animate-pulse-slow' 
        : 'from-primary-500/20 to-teal-500/10 border-primary-500/30 text-primary-400',
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, i) => {
        const IconComponent = card.icon;
        return (
          <div 
            key={i} 
            className={`glass-card p-5 bg-gradient-to-br ${card.color} hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group`}
          >
            {/* Background Accent Grid or Circles */}
            <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
              <IconComponent className="w-32 h-32" />
            </div>

            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase mb-1">{card.title}</p>
                <h3 className="text-2xl font-bold text-slate-100 tracking-tight mb-1">{card.value}</h3>
                <p className="text-slate-500 text-xs">{card.subtext}</p>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <IconComponent className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
