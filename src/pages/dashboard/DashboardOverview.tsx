import { motion } from 'framer-motion';
import { MapPin, Users, Search, TrendingUp, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { usePublicLocations } from '@/hooks/useLocations';
import { demoAnalytics } from '@/data/demoData';
import { TrialExpirationBanner } from '@/components/dashboard/TrialExpirationBanner';
import { TrialUpgradeCard } from '@/components/dashboard/TrialUpgradeCard';
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

export default function DashboardOverview() {
  const { data: locations = [] } = usePublicLocations();
  const { client } = useAuthStore();
  const analytics = demoAnalytics;

  const stats = [
    { 
      label: 'Total Locations', 
      value: locations.length.toString(), 
      change: '+2', 
      trend: 'up',
      icon: MapPin,
      color: 'bg-primary/10 text-primary'
    },
    { 
      label: 'Active Locations', 
      value: locations.filter(l => l.isActive).length.toString(), 
      change: '0', 
      trend: 'neutral',
      icon: Users,
      color: 'bg-success/10 text-success'
    },
    { 
      label: 'Total Searches', 
      value: '12.5K', 
      change: '+18%', 
      trend: 'up',
      icon: Search,
      color: 'bg-accent/10 text-accent'
    },
    { 
      label: 'Avg. Views/Location', 
      value: '2.1K', 
      change: '+12%', 
      trend: 'up',
      icon: TrendingUp,
      color: 'bg-warning/10 text-warning'
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Trial Expiration Warning - only shows when 3 days or less */}
      <TrialExpirationBanner />
      
      {/* Trial Upgrade CTA Card */}
      <TrialUpgradeCard />
      
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of {client?.name}.</p>
        </div>
        <Link to="/dashboard/locations">
          <Button variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </Link>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                stat.trend === 'up' ? 'text-success' : stat.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {stat.trend === 'up' && <ArrowUpRight className="h-4 w-4" />}
                {stat.trend === 'down' && <ArrowDownRight className="h-4 w-4" />}
                {stat.change}
              </div>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Locations */}
        <motion.div variants={itemVariants} className="p-6 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Top Locations</h2>
            <Link to="/dashboard/analytics" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {analytics.topLocations.slice(0, 5).map((loc, index) => (
              <div key={loc.locationId} className="flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{loc.name}</p>
                  <div className="w-full h-2 bg-muted rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                      style={{ width: `${(loc.views / analytics.topLocations[0].views) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{loc.views.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Search Trends */}
        <motion.div variants={itemVariants} className="p-6 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Search Trends</h2>
            <Link to="/dashboard/analytics" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {analytics.searchTrends.map((trend) => (
              <div key={trend.term} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">"{trend.term}"</span>
                </div>
                <span className="text-sm text-muted-foreground">{trend.count.toLocaleString()} searches</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants} className="p-6 rounded-xl border border-border bg-card">
        <h2 className="text-lg font-semibold mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {analytics.activityLog.map((log) => (
            <div key={log.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{log.action}</p>
                <p className="text-sm text-muted-foreground">
                  {log.locationName && <span className="text-foreground">{log.locationName}</span>}
                  {log.locationName && ' • '}
                  by {log.userName}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(log.timestamp).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="grid sm:grid-cols-3 gap-4">
        <Link 
          to="/dashboard/locations"
          className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
        >
          <MapPin className="h-8 w-8 text-primary mb-4" />
          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Manage Locations</h3>
          <p className="text-sm text-muted-foreground">Add, edit, or remove store locations</p>
        </Link>
        
        <Link 
          to="/dashboard/analytics"
          className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
        >
          <TrendingUp className="h-8 w-8 text-accent mb-4" />
          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">View Analytics</h3>
          <p className="text-sm text-muted-foreground">Track performance and trends</p>
        </Link>
        
        <Link 
          to="/locator"
          className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
        >
          <Search className="h-8 w-8 text-success mb-4" />
          <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Preview Locator</h3>
          <p className="text-sm text-muted-foreground">See how customers find you</p>
        </Link>
      </motion.div>
    </motion.div>
  );
}
