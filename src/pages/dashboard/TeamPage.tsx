import { motion } from 'framer-motion';
import { Users, Plus, Mail, Shield, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserOrganization } from '@/hooks/useUserOrganization';
import { Link } from 'react-router-dom';

const teamMembers = [
  { id: '1', name: 'John Smith', email: 'john@acme.com', role: 'Admin', avatar: 'J' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@acme.com', role: 'Staff', avatar: 'S' },
  { id: '3', name: 'Mike Williams', email: 'mike@acme.com', role: 'Staff', avatar: 'M' },
];

export default function TeamPage() {
  const { role, isLoading } = useUserOrganization();

  // Show access denied for non-admin users
  if (!isLoading && role !== 'admin') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[60vh] text-center"
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          You don't have permission to access this page. Team management is only available to administrators.
        </p>
        <Button asChild>
          <Link to="/dashboard">Return to Dashboard</Link>
        </Button>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage your team members and permissions</p>
        </div>
        <Button variant="hero">
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Team Members */}
      <div className="space-y-4">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="p-4 rounded-xl border border-border bg-card"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Avatar and Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-base sm:text-lg flex-shrink-0">
                  {member.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium truncate">{member.name}</p>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                      member.role === 'Admin' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-secondary text-secondary-foreground'
                    }`}>
                      <Shield className="h-3 w-3" />
                      {member.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end sm:flex-shrink-0">
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Roles Info */}
      <div className="p-6 rounded-xl border border-border bg-muted/30">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Role Permissions
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-card border border-border">
            <h4 className="font-medium mb-2">Admin</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Full access to all locations</li>
              <li>• Manage team members</li>
              <li>• View and export analytics</li>
              <li>• Manage billing and subscription</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <h4 className="font-medium mb-2">Staff</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View and edit locations</li>
              <li>• View analytics</li>
              <li>• Cannot manage team</li>
              <li>• Cannot access billing</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
