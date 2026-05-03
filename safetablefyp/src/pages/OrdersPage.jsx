import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, ChefHat, CheckCircle2, Package, Utensils, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { useOrders } from "@/hooks/useOrders";
import { useService } from "@/hooks/useService";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', step: 1 },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', step: 2 },
  preparing: { label: 'Preparing', icon: ChefHat, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', step: 3 },
  ready: { label: 'Ready', icon: Package, color: 'bg-green-500/20 text-green-400 border-green-500/30', step: 4 },
  completed: { label: 'Completed', icon: Utensils, color: 'bg-muted text-muted-foreground border-muted', step: 5 }
};

const TARGET_PREP_TIME = 20; // minutes

import { useState, useEffect, useMemo } from "react";

const OrdersPage = () => {
  const { getMyOrders, getActiveOrders, tableNumber } = useOrders();
  const { requestService, requests } = useService();
  const myOrders = getMyOrders();
  const rawActiveOrders = getActiveOrders();
  const completedOrders = myOrders.filter((o) => o.status === 'completed');

  const activeServiceRequest = requests.find((r) =>
  r.tableNumber === tableNumber.toString() &&
  r.status === 'pending' &&
  r.type === 'clean'
  );

  const handleRequestCleaning = () => {
    requestService(tableNumber.toString(), 'clean');
    toast.success("Cleaning staff has been notified!");
  };
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeOrders = useMemo(() => {
    return rawActiveOrders.map((order) => {
      const createdAt = new Date(order.createdAt);
      const elapsedMinutes = (now.getTime() - createdAt.getTime()) / 60000;
      const progress = Math.min(elapsedMinutes / TARGET_PREP_TIME * 100, 100);
      const estimatedTime = Math.max(0, Math.round(TARGET_PREP_TIME - elapsedMinutes));
      return { ...order, progress, estimatedTime };
    });
  }, [rawActiveOrders, now]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 glass-morphism border-b border-border">
        
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gradient-primary">My Orders</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Table Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6">
          
          <Card className="glass-morphism p-4 border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">You are seated at</p>
                <p className="text-2xl font-bold text-gradient-primary">Table #{tableNumber}</p>
              </div>
              <p className="text-sm text-muted-foreground max-w-[200px] text-right">
                Only your orders for this table are shown here
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4 mb-8">
          
          <Card className="glass-morphism p-4 text-center border-2 border-primary/20">
            <p className="text-3xl font-bold text-gradient-primary">{activeOrders.length}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </Card>
          <Card className="glass-morphism p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{completedOrders.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </Card>
        </motion.div>

        {/* Service Request Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8">
          
          <Card className="glass-morphism p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-primary/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Table Service</h3>
                <p className="text-xs text-muted-foreground">
                  {activeServiceRequest ?
                  "Cleaning staff has been notified" :
                  "Request assistance for your table"}
                </p>
              </div>
            </div>

            {activeServiceRequest ?
            <Button disabled className="w-full sm:w-auto bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 cursor-not-allowed">
                <Clock className="w-4 h-4 mr-2 animate-pulse" />
                Request Sent
              </Button> :

            <Button onClick={handleRequestCleaning} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                <Sparkles className="w-4 h-4 mr-2" />
                Request Cleaning
              </Button>
            }
          </Card>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12">
          
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Your Orders
          </h2>

          {activeOrders.length === 0 ?
          <Card className="glass-morphism p-12 text-center border-2 border-dashed border-border">
              <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}>
              
                <Utensils className="w-20 h-20 mx-auto mb-6 text-muted-foreground/50" />
                <h3 className="text-2xl font-semibold mb-2">No Active Orders</h3>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  Start ordering from our menu to see your orders here
                </p>
                <Link to="/menu">
                  <Button variant="hero" size="lg">
                    Browse Menu
                  </Button>
                </Link>
              </motion.div>
            </Card> :

          <div className="space-y-6">
              {activeOrders.map((order, idx) => {
              const StatusIcon = statusConfig[order.status].icon;
              const currentStep = statusConfig[order.status].step;

              return (
                <motion.div
                  key={order.orderId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  layout>
                  
                    <Card className="glass-morphism overflow-hidden border-2 border-primary/30">
                      {/* Order Header */}
                      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 border-b border-border">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                            <h3 className="text-2xl font-bold text-gradient-primary tracking-wider">
                              {order.orderId}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={`${statusConfig[order.status].color} px-4 py-2 text-sm`}>
                              <StatusIcon className="w-4 h-4 mr-2" />
                              {statusConfig[order.status].label}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Live Progress Bar */}
                      {order.status !== 'completed' &&
                    <div className="px-6 pt-6 pb-2">
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <Clock className="w-4 h-4 text-primary animate-pulse" />
                              Estimated Wait
                            </span>
                            <span className="text-lg font-bold text-foreground">
                              {order.status === 'ready' ? "Ready!" : `~${order.estimatedTime} min`}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                          className={`h-full ${order.status === 'ready' ? 'bg-green-500' :
                          order.progress > 85 ? 'bg-red-500' :
                          order.progress > 50 ? 'bg-orange-500' :
                          'bg-primary'}`
                          }
                          initial={{ width: 0 }}
                          animate={{ width: `${order.progress}%` }}
                          transition={{ duration: 0.5 }} />
                        
                          </div>
                        </div>
                    }

                      {/* Progress Steps */}
                      <div className="px-6 py-4 border-b border-border">
                        <div className="flex items-center justify-between relative">
                          {/* Progress Line */}
                          <div className="absolute top-4 left-0 right-0 h-1 bg-muted rounded-full">
                            <motion.div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: `${(currentStep - 1) / 4 * 100}%` }}
                            transition={{ duration: 0.5 }} />
                          
                          </div>

                          {['pending', 'confirmed', 'preparing', 'ready', 'completed'].map((status, i) => {
                          const config = statusConfig[status];
                          const Icon = config.icon;
                          const isActive = currentStep > i;
                          const isCurrent = currentStep === i + 1;

                          return (
                            <div key={status} className="relative z-10 flex flex-col items-center">
                                <motion.div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ?
                                "bg-gradient-to-br from-primary to-accent text-primary-foreground" :
                                isCurrent ?
                                "bg-primary/20 text-primary border-2 border-primary" :
                                "bg-muted text-muted-foreground"}`
                                }
                                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                                transition={{ duration: 1, repeat: isCurrent ? Infinity : 0 }}>
                                
                                  <Icon className="w-4 h-4" />
                                </motion.div>
                                <span className={`text-xs mt-2 ${isCurrent ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                                  {config.label}
                                </span>
                              </div>);

                        })}
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Table #{order.tableNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold text-gradient-primary">
                              ${order.totalPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="bg-muted/30 rounded-lg p-4">
                          <p className="text-sm font-semibold mb-3">
                            {order.items.reduce((acc, item) => acc + item.quantity, 0)} Items
                          </p>
                          <div className="space-y-2">
                            {order.items.map((item) =>
                          <div
                            key={item.id}
                            className="flex justify-between items-center text-sm">
                            
                                <span className="flex items-center gap-2">
                                  <span className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                                    {item.quantity}
                                  </span>
                                  {item.name}
                                </span>
                                <span className="font-semibold">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                          )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>);

            })}
            </div>
          }
        </motion.section>


      </main>
    </div>);

};

export default OrdersPage;