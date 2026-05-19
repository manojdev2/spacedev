import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, MapPin, Search, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { demoAnalytics } from '@/data/demoData';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const monthlyData = [
  { month: 'Jan', searches: 8500, views: 12000 },
  { month: 'Feb', searches: 9200, views: 13500 },
  { month: 'Mar', searches: 10100, views: 14200 },
  { month: 'Apr', searches: 9800, views: 13800 },
  { month: 'May', searches: 11500, views: 16000 },
  { month: 'Jun', searches: 12458, views: 17500 },
];

const categoryData = [
  { name: 'Retail', value: 3, color: 'hsl(var(--primary))' },
  { name: 'Service Center', value: 1, color: 'hsl(var(--accent))' },
  { name: 'Branch', value: 1, color: 'hsl(var(--warning))' },
  { name: 'Headquarters', value: 1, color: 'hsl(var(--success))' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AnalyticsPage() {
  const analytics = demoAnalytics;
  const { toast } = useToast();

  const handleExport = () => {
    const csv = [
      ['Metric', 'Value'].join(','),
      ['Total Locations', analytics.totalLocations].join(','),
      ['Active Locations', analytics.activeLocations].join(','),
      ['Total Searches', analytics.totalSearches].join(','),
      '',
      ['Top Locations', 'Views'].join(','),
      ...analytics.topLocations.map((loc) => [loc.name, loc.views].join(',')),
      '',
      ['Search Terms', 'Count'].join(','),
      ...analytics.searchTrends.map((trend) => [trend.term, trend.count].join(',')),
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics.csv';
    a.click();
    
    toast({
      title: 'Export successful',
      description: 'Analytics data has been exported to CSV.',
    });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your store locator performance</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 Days
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Total Searches</span>
          </div>
          <p className="text-2xl font-bold">{analytics.totalSearches.toLocaleString()}</p>
        </div>
        <div className="p-6 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-5 w-5 text-accent" />
            <span className="text-sm text-muted-foreground">Total Locations</span>
          </div>
          <p className="text-2xl font-bold">{analytics.totalLocations}</p>
        </div>
        <div className="p-6 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-success" />
            <span className="text-sm text-muted-foreground">Avg. Views</span>
          </div>
          <p className="text-2xl font-bold">2.1K</p>
        </div>
        <div className="p-6 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 mb-2">
            <Search className="h-5 w-5 text-warning" />
            <span className="text-sm text-muted-foreground">Search Rate</span>
          </div>
          <p className="text-2xl font-bold">68%</p>
        </div>
      </motion.div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <motion.div variants={itemVariants} className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-6">Monthly Trends</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-muted-foreground" fontSize={12} />
                <YAxis className="text-muted-foreground" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="searches"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--accent))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Searches</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className="text-sm text-muted-foreground">Views</span>
            </div>
          </div>
        </motion.div>

        {/* Location Categories */}
        <motion.div variants={itemVariants} className="p-6 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-6">Location Categories</h2>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-sm text-muted-foreground">{cat.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Top Locations Bar Chart */}
      <motion.div variants={itemVariants} className="p-6 rounded-xl border border-border bg-card">
        <h2 className="text-lg font-semibold mb-6">Top Performing Locations</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.topLocations} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" className="text-muted-foreground" fontSize={12} />
              <YAxis 
                type="category" 
                dataKey="name" 
                className="text-muted-foreground" 
                fontSize={12}
                width={150}
                tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar 
                dataKey="views" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Search Trends Table */}
      <motion.div variants={itemVariants} className="p-6 rounded-xl border border-border bg-card">
        <h2 className="text-lg font-semibold mb-6">Search Trends</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium text-sm">Rank</th>
                <th className="text-left p-3 font-medium text-sm">Search Term</th>
                <th className="text-left p-3 font-medium text-sm">Count</th>
                <th className="text-left p-3 font-medium text-sm">Share</th>
              </tr>
            </thead>
            <tbody>
              {analytics.searchTrends.map((trend, index) => {
                const totalSearches = analytics.searchTrends.reduce((sum, t) => sum + t.count, 0);
                const share = ((trend.count / totalSearches) * 100).toFixed(1);
                return (
                  <tr key={trend.term} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                    </td>
                    <td className="p-3 font-medium">"{trend.term}"</td>
                    <td className="p-3 text-muted-foreground">{trend.count.toLocaleString()}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
