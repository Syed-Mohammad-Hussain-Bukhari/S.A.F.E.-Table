import { useOrders } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, Flame, ChefHat, Bell, AlertCircle, Search, ArrowUpDown, Activity, TrendingUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState, useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious } from
"@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

import { useLocation } from "react-router-dom";

// Helper to format time elapsed
const getElapsedTime = (createdAt, now) => {
  const diff = Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000);
  return diff;
};

const ITEMS_PER_PAGE = 8;
const TARGET_PREP_TIME = 20; // 20 minutes target

const KitchenDashboard = () => {
  const { getAllOrders, updateOrderStatus } = useOrders();
  const location = useLocation();
  const isAdminView = location.pathname.startsWith('/admin');
  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const prevOrdersLength = useRef(0);

  // Filter/Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Voice Alerts Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const currentOrders = getAllOrders();
      setOrders(currentOrders);
      setNow(new Date());

      // Check for new orders
      if (currentOrders.length > prevOrdersLength.current) {
        // Find the newest order
        const newOrder = currentOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        // Only announce if it's recent (to avoid blast on load) and pending
        const isRecent = new Date().getTime() - new Date(newOrder.createdAt).getTime() < 10000;

        if (newOrder && newOrder.status === 'pending' && isRecent) {
          const utterance = new SpeechSynthesisUtterance(`New order for Table ${newOrder.tableNumber}`);
          utterance.rate = 1.1;
          utterance.pitch = 1.1;
          window.speechSynthesis.speak(utterance);
        }
      }
      prevOrdersLength.current = currentOrders.length;

    }, 1000);
    return () => clearInterval(timer);
  }, [getAllOrders]);

  // Derived State: Filtered & Sorted Orders
  const filteredOrders = useMemo(() => {
    // Kitchen sees orders until server picks them up (delivering)
    let result = orders.filter((o) =>
    o.status !== 'completed' &&
    o.status !== 'delivering' &&
    o.status !== 'delivered'
    );

    if (statusFilter !== "all") {
      // Ready tab includes both ready and awaiting_pickup (notified but not picked up)
      if (statusFilter === "ready") {
        result = result.filter((o) => o.status === 'ready' || o.status === 'awaiting_pickup');
      }
      // Serving tab shows delivering orders (in transit to table)
      else if (statusFilter === "awaiting_pickup") {
        result = result.filter((o) => o.status === 'delivering');
      } else
      {
        result = result.filter((o) => o.status === statusFilter);
      }
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((o) =>
      o.orderId.toLowerCase().includes(lowerQuery) ||
      o.tableNumber.toString().includes(lowerQuery) ||
      o.items.some((i) => i.name.toLowerCase().includes(lowerQuery))
      );
    }

    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();

      if (sortBy === "newest") return timeB - timeA;
      if (sortBy === "oldest") return timeA - timeB;
      if (sortBy === "time_elapsed") return timeA - timeB;
      return 0;
    });

    return result;
  }, [orders, statusFilter, searchQuery, sortBy]);

  // Live Stats
  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'completed');
    const completed = orders.filter((o) => o.status === 'completed');

    return {
      activeCount: active.length,
      completedCount: completed.length
    };
  }, [orders]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Configs
  const filterTabs = [
  { id: 'pending', label: 'New Orders' },
  { id: 'preparing', label: 'In Progress' },
  { id: 'ready', label: 'Ready' },
  { id: 'awaiting_pickup', label: 'Serving' },
  { id: 'all', label: 'All Active' }];


  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':return { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/50", label: "Received", icon: Bell };
      case 'preparing':return { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/50", label: "Preparing", icon: Flame };
      case 'ready':return { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/50", label: "Ready", icon: CheckCircle2 };
      case 'awaiting_pickup':return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/50", label: "Notified", icon: Bell };
      case 'delivering':return { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/50", label: "Serving", icon: TrendingUp };
      case 'delivered':return { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/50", label: "Served", icon: CheckCircle2 };
      default:return { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/50", label: "Completed", icon: CheckCircle2 };
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] bg-background text-foreground flex flex-col overflow-hidden">
            {/* Conditional Admin Context Header */}
            {isAdminView &&
      <div className="px-6 py-4 border-b border-border bg-card/30">
                    <div className="flex items-center gap-3">
                        <ChefHat className="w-6 h-6 text-orange-500" />
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Kitchen Display</h1>
                            <p className="text-sm text-muted-foreground">Live order management</p>
                        </div>
                    </div>
                </div>
      }

            {/* 2. Top Stats Bar */}
            <div className="bg-card/50 border-b border-border px-6 py-2 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <div className="flex gap-6">
                    <span className="flex items-center gap-2"><Activity className="w-3 h-3 text-primary" /> Active: <span className="text-foreground font-bold">{stats.activeCount}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">Status: <span className={`font-bold ${stats.activeCount === 0 ? 'text-green-500' : 'text-orange-500'}`}>{stats.activeCount === 0 ? 'Clear' : 'Busy'}</span></span>
                </div>
            </div>

            {/* Toolbar Header - Functional Control Bar */}
            <header className="px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center z-10 bg-background/50 backdrop-blur-sm sticky top-0">

                {/* Left Side: Filter Tabs (View Control) */}
                <div className="flex gap-2 p-1 bg-muted/50 rounded-lg border border-border backdrop-blur-sm w-full md:w-auto overflow-x-auto">
                    {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            let activeStyle = "bg-primary/20 text-primary border border-primary/50 shadow-sm"; // Default active
            let hoverStyle = "hover:text-foreground hover:bg-accent";
            let textStyle = "text-muted-foreground";

            switch (tab.id) {
              case 'pending':
                activeStyle = "bg-blue-500/20 text-blue-500 border border-blue-500/50 shadow-[0_0_10px_-4px_rgba(59,130,246,0.5)]";
                hoverStyle = "hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent";
                textStyle = isActive ? "text-blue-500" : "text-muted-foreground";
                break;
              case 'preparing':
                activeStyle = "bg-orange-500/20 text-orange-500 border border-orange-500/50 shadow-[0_0_10px_-4px_rgba(249,115,22,0.5)]";
                hoverStyle = "hover:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/30 border border-transparent";
                textStyle = isActive ? "text-orange-500" : "text-muted-foreground";
                break;
              case 'ready':
                activeStyle = "bg-green-500/20 text-green-500 border border-green-500/50 shadow-[0_0_10px_-4px_rgba(34,197,94,0.5)]";
                hoverStyle = "hover:text-green-400 hover:bg-green-500/10 hover:border-green-500/30 border border-transparent";
                textStyle = isActive ? "text-green-500" : "text-muted-foreground";
                break;
              case 'awaiting_pickup': // Serving Tab
                activeStyle = "bg-blue-500/20 text-blue-500 border border-blue-500/50 shadow-[0_0_10px_-4px_rgba(59,130,246,0.5)]";
                hoverStyle = "hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent";
                textStyle = isActive ? "text-blue-500" : "text-muted-foreground";
                break;
              case 'all': // All Active - Primary Theme (Cyan)
                activeStyle = "bg-primary/20 text-primary border border-primary/50 shadow-[0_0_15px_-4px_hsl(var(--primary)/0.5)]";
                hoverStyle = "hover:text-primary hover:bg-primary/10 hover:border-primary/30 border border-transparent";
                textStyle = isActive ? "text-primary/90 font-extrabold" : "text-muted-foreground";
                break;
              default:
                activeStyle = "bg-muted text-foreground shadow-sm border border-border";
                hoverStyle = "hover:text-foreground hover:bg-accent border border-transparent";
                break;
            }

            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all duration-200 whitespace-nowrap ${isActive ? activeStyle : `${textStyle} ${hoverStyle}`}`}>
                
                                {tab.label}
                            </button>);

          })}
                </div>

                {/* Right Side: Search & Sort (Tools) */}
                <div className="flex gap-4 items-center w-full md:w-auto shrink-0">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
              placeholder="Search orders..."
              className="pl-9 bg-input border-input focus:border-primary w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} />
            
                    </div>

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[140px] bg-input border-input">
                            <div className="flex items-center gap-2">
                                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                                <SelectValue placeholder="Sort" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="time_elapsed">Most Urgent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </header>

            <ScrollArea className="flex-1 p-6 pt-2">
                {paginatedOrders.length > 0 ?
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                        <AnimatePresence mode="popLayout">
                            {paginatedOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const elapsed = getElapsedTime(order.createdAt, now);
              const progress = Math.min(elapsed / TARGET_PREP_TIME * 100, 100);
              const isLate = elapsed > TARGET_PREP_TIME && order.status !== 'ready';

              // Progress Bar Color Logic
              let progressColor = "bg-green-500";
              if (progress > 50) progressColor = "bg-yellow-500";
              if (progress > 85) progressColor = "bg-red-500";

              return (
                <motion.div
                  key={order.orderId}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative group"
                  onClick={() => setSelectedOrder(order)}>
                  
                                        <Card className={`
                                            h-full border bg-card/60 backdrop-blur-sm overflow-hidden cursor-pointer hover-glow
                                            ${statusConfig.border}
                                            ${isLate ? "ring-2 ring-destructive/50 shadow-destructive/20" : ""}
                                        `}>
                                            <div className={`p-3 border-b ${statusConfig.border} ${statusConfig.bg} flex justify-between items-center`}>
                                                <div className="flex items-center gap-2">
                                                    <statusConfig.icon className={`w-4 h-4 ${statusConfig.color}`} />
                                                    <span className={`text-sm font-bold ${statusConfig.color}`}>{statusConfig.label}</span>
                                                </div>
                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${isLate ? "bg-destructive/20 text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>
                                                    <Clock className="w-3 h-3" />
                                                    <span className="text-xs font-mono font-bold">{elapsed}m</span>
                                                </div>
                                            </div>

                                            {/* 3. Visual Urgency Progress Bar */}
                                            {order.status !== 'ready' &&
                    <div className="h-1 w-full bg-slate-800">
                                                    <div className={`h-full ${progressColor} transition-all duration-1000`} style={{ width: `${progress}%` }} />
                                                </div>
                    }

                                            <div className="p-5">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-2xl font-bold text-white">Table {order.tableNumber}</h3>
                                                    <Badge variant="outline" className="text-slate-500 border-slate-700 font-mono text-[10px]">
                                                        #{order.orderId.split('-')[1]}
                                                    </Badge>
                                                </div>

                                                <div className="space-y-3">
                                                    {order.items.slice(0, 4).map((item, idx) =>
                        <div key={idx} className="flex justify-between items-start text-sm">
                                                            <div className="flex gap-2">
                                                                <span className="font-bold text-slate-200 w-5">{item.quantity}x</span>
                                                                <span className="text-slate-300">{item.name}</span>
                                                            </div>
                                                        </div>
                        )}
                                                    {order.items.length > 4 &&
                        <p className="text-xs text-slate-500 italic pt-1">+ {order.items.length - 4} more items...</p>
                        }
                                                </div>

                                                {isLate &&
                      <div className="absolute top-2 right-2 animate-pulse">
                                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                                    </div>
                      }
                                            </div>

                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-slate-900/90 border-t border-slate-800 translate-y-full group-hover:translate-y-0 transition-transform duration-200 flex justify-center">
                                                <span className="text-slate-300 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                                                    {order.status === 'ready' ? "Click to Complete" : "Click to Manage"}
                                                </span>
                                            </div>
                                        </Card>
                                    </motion.div>);

            })}
                        </AnimatePresence>
                    </div> :

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
          
                        <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="p-8 rounded-full bg-gradient-to-br from-card via-muted/50 to-card mb-6 border-2 border-border shadow-2xl">
            
                            <ChefHat className="w-16 h-16 text-muted-foreground/50" />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-muted-foreground mb-2">All Clear in the Kitchen</h3>
                        <p className="text-muted-foreground/80 text-center max-w-md">
                            {statusFilter === 'all' || statusFilter === 'pending' ?
            "Waiting for orders... The kitchen is ready!" :
            `No ${statusFilter} orders at the moment.`
            }
                        </p>
                        <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span>System Ready</span>
                        </motion.div>
                    </motion.div>
        }
            </ScrollArea>

            {/* Pagination (Existing) */}
            {totalPages > 1 &&
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur flex justify-center">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
              
                            </PaginationItem>

                            {Array.from({ length: totalPages }).map((_, i) =>
            <PaginationItem key={i}>
                                    <PaginationLink
                isActive={currentPage === i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className="cursor-pointer">
                
                                        {i + 1}
                                    </PaginationLink>
                                </PaginationItem>
            )}

                            <PaginationItem>
                                <PaginationNext
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
              
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
      }

            <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onUpdateStatus={updateOrderStatus} />
      
        </div>);

};

// Modal Component for Detailed Checklist
const OrderDetailsDialog = ({ order, open, onOpenChange, onUpdateStatus




}) => {
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    if (open) {
      setCheckedItems({});
    }
  }, [open]);

  if (!order) return null;

  const toggleItem = (id) => {
    // Only allow checking if order is in 'preparing' state
    // If pending, no checks needed (just start). If ready, no checks needed (just complete).
    if (order.status !== 'preparing') return;

    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const allChecked = order.items.every((item, idx) => checkedItems[`${item.id}-${idx}`]);

  // Determine next status and button label
  let nextStatus = '';
  let buttonLabel = '';
  let isButtonDisabled = false;

  if (order.status === 'pending' || order.status === 'confirmed') {
    nextStatus = 'preparing';
    buttonLabel = 'Begin Preparation';
  } else if (order.status === 'preparing') {
    nextStatus = 'ready';
    buttonLabel = allChecked ? 'Mark as Ready' : 'Verify Items Before Completion';
    isButtonDisabled = !allChecked; // Require checks for preparing -> ready
  } else if (order.status === 'ready') {
    // Kitchen manually notifies server
    nextStatus = 'awaiting_pickup';
    buttonLabel = '🔔 Notify Server';
    isButtonDisabled = false;
  } else if (order.status === 'awaiting_pickup') {
    // Waiting for server to pick up
    nextStatus = '';
    buttonLabel = 'Server Notified';
    isButtonDisabled = true;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-background border-border text-foreground max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden sm:max-w-2xl">
                <DialogHeader className="p-6 pb-2 bg-muted/30 border-b border-border">
                    <div className="flex justify-between items-center pr-8">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                Table #{order.tableNumber}
                                <Badge variant="secondary" className="bg-muted text-muted-foreground border border-border">
                                    {order.status.toUpperCase()}
                                </Badge>
                            </DialogTitle>
                            <p className="text-muted-foreground font-mono text-sm mt-1">{order.orderId}</p>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 pt-2">
                    <div className="space-y-6">
                        {order.status === 'preparing' &&
            <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-4 mb-6">
                                <h4 className="text-blue-200 font-bold mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> Usage Logic
                                </h4>
                                <p className="text-slate-300 text-sm">
                                    Please verify and check off each item as they are plated.
                                </p>
                            </div>
            }

                        <div className="space-y-4">
                            {order.items.map((item, idx) => {
                const uniqueId = `${item.id}-${idx}`;
                const isPreparing = order.status === 'preparing';
                const isChecked = checkedItems[uniqueId];

                return (
                  <div
                    key={uniqueId}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${isPreparing ? 'cursor-pointer hover:border-primary/50' : ''} ${
                    isChecked ?
                    "bg-green-500/10 border-green-500/30 opacity-60" :
                    "bg-card border-border hover:bg-muted/50"}`
                    }
                    onClick={() => toggleItem(uniqueId)}>
                    
                                        {/* Only show checkbox if in preparing state */}
                                        {isPreparing &&
                    <Checkbox
                      checked={isChecked || false}
                      className="mt-1 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />

                    }

                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <h3 className={`font-bold text-lg ${isChecked ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                                    {item.quantity}x {item.name}
                                                </h3>
                                                <span className="text-muted-foreground font-mono">${item.price}</span>
                                            </div>

                                            {item.customizations && item.customizations.length > 0 &&
                      <ul className="mt-2 space-y-1 ml-1 border-l-2 border-border pl-3">
                                                    {item.customizations.map((c, i) =>
                        <li key={i} className="text-sm text-muted-foreground block">• {c}</li>
                        )}
                                                </ul>
                      }

                                            {item.notes &&
                      <div className="mt-2 bg-orange-500/10 text-orange-400 px-3 py-1.5 rounded text-sm font-medium inline-block border border-orange-500/20">
                                                    Note: {item.notes}
                                                </div>
                      }
                                        </div>
                                    </div>);

              })}
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 bg-muted/30 border-t border-border">
                    <div className="flex w-full gap-4">
                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        {order.status !== 'completed' &&
            <Button
              disabled={isButtonDisabled}
              className={`flex-[2] text-lg font-bold ${isButtonDisabled ?
              "opacity-50 cursor-not-allowed bg-muted text-muted-foreground" :
              order.status === 'ready' ?
              "bg-green-600 hover:bg-green-500 text-white" // Ready -> Complete is green
              : allChecked && order.status === 'preparing' ?
              "bg-orange-500 hover:bg-orange-400 animate-pulse text-white" // Checked -> Ready is orange
              : "bg-blue-600 hover:bg-blue-500 text-white" // Pending -> Cooking is blue
              }`}
              onClick={() => {
                if (nextStatus) {
                  onUpdateStatus(order.orderId, nextStatus);
                  onOpenChange(false);
                }
              }}>
              
                                {buttonLabel}
                            </Button>
            }
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>);

};

export default KitchenDashboard;