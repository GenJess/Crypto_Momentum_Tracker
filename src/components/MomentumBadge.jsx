import React from 'react';

const MomentumBadge = ({ momentum }) => {
    const badgeClasses = {
      hot: 'bg-accent-hot/15 text-accent-hot border-accent-hot/30',
      active: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',
      positive: 'bg-accent-success/15 text-accent-success border-accent-success/30',
      moderate: 'bg-accent-warning/15 text-accent-warning border-accent-warning/30',
      neutral: 'bg-text-secondary/15 text-text-secondary border-text-secondary/30',
    };

    return (
      <div className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 border ${badgeClasses[momentum] || badgeClasses['neutral']}`}>
        {momentum}
      </div>
    );
};

export default MomentumBadge;
