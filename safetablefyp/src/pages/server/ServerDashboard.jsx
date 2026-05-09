import { useOrders } from "@/hooks/useOrders";
import { useService } from "@/hooks/useService";
<<<<<<< HEAD
=======
import { useKitchenSocket } from "@/hooks/useKitchenSocket";
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConciergeBell, Clock, Search, Utensils, AlertCircle, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
<<<<<<< HEAD
import { useState, useEffect, useMemo } from "react";
=======
import { useEffect, useMemo, useState } from "react";
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
import { useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

const ServerDashboard = () => {
<<<<<<< HEAD
  const { getAllOrders, updateOrderStatus } = useOrders();
  const { requests, resolveService } = useService();
  const location = useLocation();
  const isAdminView = location.pathname.startsWith('/admin');
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState('awaiting_pickup');

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Get relevant orders for server - only orders that have been notified
  const allOrders = getAllOrders();
  const serverOrders = allOrders.filter((order) =>
  order.status === 'awaiting_pickup' || order.status === 'delivering' || order.status === 'delivered'
  );

  // Filter service requests (help, bill)
  const serviceRequests = requests.filter((req) =>
  (req.type === 'help' || req.type === 'bill') && req.status === 'pending'
  );

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let result = serverOrders.filter((o) => o.status === activeTab);

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((o) =>
      o.orderId.toLowerCase().includes(lowerQuery) ||
      o.tableNumber.toString().includes(lowerQuery)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [serverOrders, activeTab, searchQuery]);

  const handlePickup = (orderId, tableNumber) => {
    updateOrderStatus(orderId, 'delivering');
    toast.success(`Order for Table ${tableNumber} picked up!`, {
      description: "Delivering to customer..."
    });
  };

  const handleDelivered = (orderId, tableNumber) => {
    updateOrderStatus(orderId, 'delivered');
    toast.success(`Order delivered to Table ${tableNumber}!`, {
      description: "Order marked as delivered"
    });
  };

  const handleComplete = (orderId, tableNumber) => {
    updateOrderStatus(orderId, 'completed');
    toast.success(`Order for Table ${tableNumber} completed!`, {
      description: "Thank you for excellent service"
    });
  };

  const handleServiceRequest = (id, tableNumber, type) => {
    resolveService(id);
    toast.success(`${type === 'help' ? 'Help' : 'Bill'} request for Table ${tableNumber} resolved!`);
  };

  const getElapsedTime = (createdAt) => {
    return Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000);
  };

  const stats = useMemo(() => {
    return {
      awaiting_pickup: serverOrders.filter((o) => o.status === 'awaiting_pickup').length,
      delivering: serverOrders.filter((o) => o.status === 'delivering').length,
      delivered: serverOrders.filter((o) => o.status === 'delivered').length,
      serviceRequests: serviceRequests.length
    };
  }, [serverOrders, serviceRequests]);

  const filterTabs = [
  { id: 'awaiting_pickup', label: 'Ready to Serve', count: stats.awaiting_pickup },
  { id: 'delivering', label: 'In Transit', count: stats.delivering },
  { id: 'delivered', label: 'Served', count: stats.delivered }];


  return (
    <div className="h-[calc(100vh-80px)] bg-background text-foreground flex flex-col overflow-hidden">
            {/* Conditional Admin Context Header */}
            {isAdminView &&
      <div className="px-6 py-4 border-b border-border bg-card/30">
                    <div className="flex items-center gap-3">
                        <ConciergeBell className="w-6 h-6 text-amber-500" />
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Server Portal</h1>
                            <p className="text-sm text-muted-foreground">Order delivery & service management</p>
                        </div>
                    </div>
                </div>
      }

            {/* Top Stats Bar - Matches Kitchen Format */}
            <div className="bg-card/50 border-b border-border px-6 py-2 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <div className="flex gap-6">
                    <span className="flex items-center gap-2"><Activity className="w-3 h-3 text-primary" /> Active: <span className="text-foreground font-bold">{stats.awaiting_pickup + stats.delivering}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">Status: <span className={`font-bold ${stats.awaiting_pickup === 0 ? 'text-green-500' : 'text-amber-500'}`}>{stats.awaiting_pickup === 0 ? 'Clear' : 'Active'}</span></span>
                </div>
            </div>

            {/* Toolbar Header - Functional Control Bar */}
            <header className="px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center z-10 bg-background/50 backdrop-blur-sm sticky top-0">
                {/* Left Side: Filter Tabs (View Control) */}
                <div className="flex gap-2 p-1 bg-muted/50 rounded-lg border border-border backdrop-blur-sm w-full md:w-auto overflow-x-auto">
                    {filterTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            let activeStyle = "";
            let hoverStyle = "hover:text-foreground hover:bg-accent border border-transparent";

            switch (tab.id) {
              case 'awaiting_pickup':
                activeStyle = "bg-amber-500/20 text-amber-500 border border-amber-500/50 shadow-[0_0_10px_-4px_rgba(245,158,11,0.5)]";
                hoverStyle = "hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 border border-transparent";
                break;
              case 'delivering':
                activeStyle = "bg-blue-500/20 text-blue-500 border border-blue-500/50 shadow-[0_0_10px_-4px_rgba(59,130,246,0.5)]";
                hoverStyle = "hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent";
                break;
              case 'delivered':
                activeStyle = "bg-green-500/20 text-green-500 border border-green-500/50 shadow-[0_0_10px_-4px_rgba(34,197,94,0.5)]";
                hoverStyle = "hover:text-green-400 hover:bg-green-500/10 hover:border-green-500/30 border border-transparent";
                break;
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all duration-200 whitespace-nowrap ${isActive ? activeStyle : `text-muted-foreground ${hoverStyle}`}`
                }>
                
                                {tab.label} ({tab.count})
                            </button>);

          })}
                </div>

                {/* Right Side: Search (Tools) */}
                <div className="flex gap-4 items-center w-full md:w-auto shrink-0">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
              placeholder="Search orders..."
              className="pl-9 bg-input border-input focus:border-amber-500 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} />
            
                    </div>
                </div>
            </header>

            <ScrollArea className="flex-1 p-6 pt-2">
                {/* Service Requests Section */}
                {serviceRequests.length > 0 &&
        <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-purple-500" />
                            Service Requests
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
                            {serviceRequests.map((req) =>
            <motion.div
              key={req.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}>
              
                                    <Card className="p-4 bg-card border-purple-500/30 hover-glow-purple">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="text-2xl font-bold">Table {req.tableNumber}</h3>
                                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 mt-1">
                                                    {req.type === 'help' ? 'Help Needed' : 'Bill Request'}
                                                </Badge>
                                            </div>
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <Button
                  className="w-full bg-purple-600 hover:bg-purple-500"
                  onClick={() => handleServiceRequest(req.id, req.tableNumber, req.type)}>
                  
                                            Resolve
                                        </Button>
                                    </Card>
                                </motion.div>
            )}
                        </div>
                    </div>
        }

                {/* Orders Section */}
                <div className="pb-20">
                    {filteredOrders.length > 0 ?
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            <AnimatePresence>
                                {filteredOrders.map((order) => {
                const elapsed = getElapsedTime(order.createdAt);
                let statusColor = "text-amber-500";
                let statusBg = "bg-amber-500/10";
                let statusBorder = "border-amber-500/30";

                if (order.status === 'delivering') {
                  statusColor = "text-blue-500";
                  statusBg = "bg-blue-500/10";
                  statusBorder = "border-blue-500/30";
                } else if (order.status === 'delivered') {
                  statusColor = "text-green-500";
                  statusBg = "bg-green-500/10";
                  statusBorder = "border-green-500/30";
                }

                return (
                  <motion.div
                    key={order.orderId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout>
                    
                                            <Card className={`p-6 bg-card ${statusBorder} shadow-lg relative overflow-hidden`}>
                                                <div className={`absolute top-0 left-0 w-1 h-full ${statusColor.replace('text-', 'bg-')}`} />

                                                <div className="mb-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Table</span>
                                                            <h3 className="text-4xl font-bold text-foreground mt-1">{order.tableNumber}</h3>
                                                        </div>
                                                        <Badge variant="outline" className={`${statusBg} ${statusColor} ${statusBorder}`}>
                                                            {order.status === 'awaiting_pickup' && 'Ready to Serve'}
                                                            {order.status === 'delivering' && 'In Transit'}
                                                            {order.status === 'delivered' && 'Served'}
                                                        </Badge>
                                                    </div>

                                                    <div className="mt-4 space-y-2">
                                                        {order.items.slice(0, 3).map((item, idx) =>
                          <div key={idx} className="flex gap-2 text-sm text-muted-foreground">
                                                                <span className="font-bold">{item.quantity}x</span>
                                                                <span>{item.name}</span>
                                                            </div>
                          )}
                                                        {order.items.length > 3 &&
                          <p className="text-xs text-muted-foreground italic">
                                                                + {order.items.length - 3} more items
                                                            </p>
                          }
                                                    </div>

                                                    <div className="flex items-center gap-2 text-muted-foreground text-sm mt-4 bg-muted/50 p-2 rounded-lg">
                                                        <Clock className="w-4 h-4" />
                                                        {elapsed}m ago
                                                    </div>
                                                </div>

                                                {order.status === 'awaiting_pickup' &&
                      <Button
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-6 text-lg"
                        onClick={() => handlePickup(order.orderId, order.tableNumber)}>
                        
                                                        Confirm Pickup
                                                    </Button>
                      }

                                                {order.status === 'delivering' &&
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-6 text-lg"
                        onClick={() => handleDelivered(order.orderId, order.tableNumber)}>
                        
                                                        Mark as Served
                                                    </Button>
                      }

                                                {order.status === 'delivered' &&
                      <Button
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-medium py-6 text-lg"
                        onClick={() => handleComplete(order.orderId, order.tableNumber)}>
                        
                                                        Complete Order
                                                    </Button>
                      }
                                            </Card>
                                        </motion.div>);

              })}
                            </AnimatePresence>
                        </div> :

          <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-2xl border border-dashed border-muted-foreground/20">
                            <Utensils className="w-16 h-16 text-muted-foreground/50 mb-4" />
                            <h2 className="text-xl font-semibold text-muted-foreground">No {activeTab} Orders</h2>
                            <p className="text-muted-foreground/80">Orders will appear here when available</p>
                        </div>
          }
                </div>
            </ScrollArea>
        </div>);

};

export default ServerDashboard;
=======
  const { orders, refreshKitchen, updateOrderStatus } = useOrders();
  const { requests, resolveService, refresh: refreshService } = useService();
  const location = useLocation();
  const isAdminView = location.pathname.startsWith("/admin");
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ready");

  useEffect(() => {
    refreshKitchen();
    refreshService({ status_filter: "pending" }).catch(() => {});
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [refreshKitchen, refreshService]);

  useKitchenSocket(() => refreshKitchen());

  const serverOrders = orders.filter((order) => order.status === "ready" || order.status === "completed");

  const serviceRequests = requests.filter(
    (req) => (req.type === "help" || req.type === "bill") && req.status === "pending",
  );

  const filteredOrders = useMemo(() => {
    let result = serverOrders.filter((o) => o.status === activeTab);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o) =>
        o.orderId.toLowerCase().includes(q) || String(o.tableNumber).includes(q),
      );
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [serverOrders, activeTab, searchQuery]);

  const handleComplete = async (orderId, tableNumber) => {
    try {
      await updateOrderStatus(orderId, "completed");
      toast.success(`Order for Table ${tableNumber} delivered & completed!`);
    } catch (err) { toast.error(err.message); }
  };

  const handleServiceRequest = async (id, tableNumber, type) => {
    await resolveService(id);
    toast.success(`${type === "help" ? "Help" : "Bill"} request for Table ${tableNumber} resolved!`);
  };

  const getElapsedTime = (createdAt) => Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000);

  const stats = useMemo(() => ({
    ready:           serverOrders.filter((o) => o.status === "ready").length,
    completed:       serverOrders.filter((o) => o.status === "completed").length,
    serviceRequests: serviceRequests.length,
  }), [serverOrders, serviceRequests]);

  const filterTabs = [
    { id: "ready",     label: "Ready to Serve", count: stats.ready },
    { id: "completed", label: "Served",         count: stats.completed },
  ];

  return (
    <div className="h-[calc(100vh-80px)] bg-background text-foreground flex flex-col overflow-hidden">
      {isAdminView && (
        <div className="px-6 py-4 border-b border-border bg-card/30">
          <div className="flex items-center gap-3">
            <ConciergeBell className="w-6 h-6 text-amber-500" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Server Portal</h1>
              <p className="text-sm text-muted-foreground">Order delivery & service management</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card/50 border-b border-border px-6 py-2 flex items-center justify-between text-xs font-mono text-muted-foreground">
        <span className="flex items-center gap-2"><Activity className="w-3 h-3 text-primary" /> Active: <span className="text-foreground font-bold">{stats.ready}</span></span>
        <span className="flex items-center gap-1">Status: <span className={`font-bold ${stats.ready === 0 ? "text-green-500" : "text-amber-500"}`}>{stats.ready === 0 ? "Clear" : "Active"}</span></span>
      </div>

      <header className="px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center z-10 bg-background/50 backdrop-blur-sm sticky top-0">
        <div className="flex gap-2 p-1 bg-muted/50 rounded-lg border border-border w-full md:w-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-bold whitespace-nowrap ${
                activeTab === tab.id ? "bg-amber-500/20 text-amber-500 border border-amber-500/50" : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"}`}>
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <div className="flex gap-4 items-center w-full md:w-auto shrink-0">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search orders..." className="pl-9 bg-input border-input focus:border-amber-500 w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 p-6 pt-2">
        {serviceRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-purple-500" />Service Requests
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
              {serviceRequests.map((req) => (
                <motion.div key={req.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <Card className="p-4 bg-card border-purple-500/30">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-2xl font-bold">Table {req.tableNumber}</h3>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 mt-1">
                          {req.type === "help" ? "Help Needed" : "Bill Request"}
                        </Badge>
                      </div>
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <Button className="w-full bg-purple-600 hover:bg-purple-500" onClick={() => handleServiceRequest(req.id, req.tableNumber, req.type)}>Resolve</Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="pb-20">
          {filteredOrders.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence>
                {filteredOrders.map((order) => {
                  const elapsed = getElapsedTime(order.createdAt);
                  const isReady = order.status === "ready";
                  return (
                    <motion.div key={order.orderId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} layout>
                      <Card className={`p-6 bg-card ${isReady ? "border-amber-500/30" : "border-green-500/30"} shadow-lg relative overflow-hidden`}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${isReady ? "bg-amber-500" : "bg-green-500"}`} />
                        <div className="mb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Table</span>
                              <h3 className="text-4xl font-bold text-foreground mt-1">{order.tableNumber}</h3>
                            </div>
                            <Badge variant="outline" className={isReady ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-green-500/10 text-green-500 border-green-500/30"}>
                              {isReady ? "Ready to Serve" : "Served"}
                            </Badge>
                          </div>
                          <div className="mt-4 space-y-2">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex gap-2 text-sm text-muted-foreground">
                                <span className="font-bold">{item.quantity}x</span>
                                <span>{item.name}</span>
                              </div>
                            ))}
                            {order.items.length > 3 && <p className="text-xs text-muted-foreground italic">+ {order.items.length - 3} more items</p>}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-sm mt-4 bg-muted/50 p-2 rounded-lg">
                            <Clock className="w-4 h-4" />{elapsed}m ago
                          </div>
                        </div>
                        {isReady && (
                          <Button className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-6 text-lg" onClick={() => handleComplete(order.orderId, order.tableNumber)}>
                            Mark as Served
                          </Button>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-2xl border border-dashed border-muted-foreground/20">
              <Utensils className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold text-muted-foreground">No {activeTab} orders</h2>
              <p className="text-muted-foreground/80">Orders will appear here when available</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ServerDashboard;
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
