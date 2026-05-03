import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, DollarSign, Activity, Clock, CheckCircle2, Flame, Bell, Utensils, Sparkles, ConciergeBell } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useOrders } from "@/hooks/useOrders";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useService } from "@/hooks/useService";

const AdminDashboard = () => {
  const { getAllOrders } = useOrders();
  const { approvedUsers } = useAuth();
  const { requests } = useService();
  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(new Date());

  // Sync with local storage and update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const currentOrders = getAllOrders();
      setOrders(currentOrders);
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [getAllOrders]);

  // Calculate Real Stats
  const stats = useMemo(() => {
    // Kitchen (Orders)
    const activeOrders = orders.filter((o) => o.status !== 'completed');

    // Cleaner (Clean Requests)
    const activeClean = requests.filter((r) => r.type === 'clean' && r.status === 'pending');

    // Server (Service Requests: Help + Bill)
    const activeService = requests.filter((r) => (r.type === 'help' || r.type === 'bill') && r.status === 'pending');

    // Staff
    const staffCount = approvedUsers.filter((u) => u.status !== 'suspended').length;
    const totalStaff = approvedUsers.length;

    return [
    {
      title: "Kitchen Orders",
      value: activeOrders.length.toString(),
      label: "Active",
      icon: Utensils,
      color: "text-orange-500",
      bg: "bg-orange-500/10"
    },
    {
      title: "Service Requests",
      value: activeService.length.toString(),
      label: "Active",
      icon: ConciergeBell,
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    {
      title: "Cleaning Tasks",
      value: activeClean.length.toString(),
      label: "Pending",
      icon: Sparkles,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      title: "Staff on Duty",
      value: staffCount.toString(),
      label: "Active",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    }];

  }, [orders, approvedUsers, requests]);

  // Get Recent Active Orders
  const recentActiveOrders = useMemo(() => {
    return orders.
    filter((o) => o.status !== 'completed').
    sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).
    slice(0, 5);
  }, [orders]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case 'preparing':return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case 'ready':return "bg-green-500/10 text-green-500 border-green-500/20";
      default:return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':return Bell;
      case 'preparing':return Flame;
      case 'ready':return CheckCircle2;
      default:return Clock;
    }
  };

  return (
    <div className="space-y-8 p-6 bg-background min-h-screen text-foreground">
            <div>
                <h1 className="text-3xl font-bold mb-2 tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground">Real-time restaurant performance metrics.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, idx) =>
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}>
          
                        <Card className="p-6 bg-card border-border backdrop-blur-sm hover-glow group h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold text-foreground">{stat.value}</h3>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label} {stat.title}</p>
                            </div>
                        </Card>
                    </motion.div>
        )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6 bg-card border-border hover-glow">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Live Kitchen Feed
                        </h2>
                        <Link to="/kitchen">
                            <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
                                View Kitchen
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {recentActiveOrders.length > 0 ?
              recentActiveOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status);
                const elapsed = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);

                return (
                  <motion.div
                    key={order.orderId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-between hover:border-primary/30 transition-colors">
                    
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-full ${getStatusColor(order.status)}`}>
                                                    <StatusIcon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-foreground">Table {order.tableNumber}</span>
                                                        <span className="text-xs text-muted-foreground font-mono">#{order.orderId.split('-')[1]}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        {elapsed}m ago
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={`${getStatusColor(order.status)} capitalize`}>
                                                {order.status}
                                            </Badge>
                                        </motion.div>);

              }) :

              <div className="text-center py-10 text-muted-foreground">
                                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p>All caught up! No active orders.</p>
                                </div>
              }
                        </AnimatePresence>
                    </div>
                </Card>

                <Card className="p-6 bg-card border-border hover-glow">
                    <h2 className="text-xl font-bold mb-6 text-foreground">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/admin/staff">
                            <Button variant="outline" className="w-full h-24 flex-col gap-2 bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground hover-glow">
                                <Users className="w-6 h-6 mb-1 text-purple-500" />
                                Staff Management
                            </Button>
                        </Link>
                        <Link to="/admin/sales">
                            <Button variant="outline" className="w-full h-24 flex-col gap-2 bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground hover-glow">
                                <DollarSign className="w-6 h-6 mb-1 text-green-500" />
                                Sales Report
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>);

};

export default AdminDashboard;