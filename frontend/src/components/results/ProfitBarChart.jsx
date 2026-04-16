import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';

//vertical bar chart of per-step estimated profit.

const ProfitBarChart = ({ pathway }) => (
  <ResponsiveContainer width="100%" height={Math.max(180, pathway.length * 18 + 40)}>
    <BarChart data={pathway.map(s => ({ name: `#${s.sequence}`, profit: parseFloat(s.projected_profit.toFixed(2)) }))} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} />
      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => v === 0 ? '0' : `${v < 0 ? '-' : ''}$${Math.abs(v)}`} width={46} />
      <Tooltip formatter={v => [`${v >= 0 ? '+' : ''}$${Number(v).toFixed(2)}`, 'Profit']} contentStyle={{ fontSize: 11 }} />
      <ReferenceLine y={0} stroke="#e5e7eb" />
      <Bar dataKey="profit" radius={[3, 3, 0, 0]}>
        {pathway.map(s => <Cell key={s.sequence} fill={s.projected_profit >= 0 ? '#059669' : '#dc2626'} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

export default ProfitBarChart;