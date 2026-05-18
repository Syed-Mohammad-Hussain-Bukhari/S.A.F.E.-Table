import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, CreditCard, ClipboardList, Loader2, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MenuScene from "@/components/MenuScene";
import dishImage from "@/assets/dish-steak.jpg";
import { useCart } from "@/hooks/useCart";
import { useOrders } from "@/hooks/useOrders";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { useToast } from "@/hooks/use-toast";
import { menuApi, stripeApi } from "@/lib/api";
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const TableBootstrap = () => {
  const { tableNumber, start, loading } = useCustomerSession();
  const { toast } = useToast();
  const [n, setN] = useState(1);
  if (tableNumber) return null;
  const handleStart = async () => {
    const result = await start(n);
    if (!result?.success) {
      toast({
        title: "Unable to start session",
        description: result?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };
  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="glass-morphism p-6 border-2 border-primary/30 max-w-xl mx-auto">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold mb-1">Pick a table to start</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You need an active table session to place orders. Pick your table number below.
            </p>
            <div className="flex gap-2 items-center">
              <input
                type="number" min={1} max={50} value={n}
                onChange={(e) => setN(Number(e.target.value) || 1)}
                className="w-24 h-10 px-3 rounded-md bg-input border border-border"
              />
              <Button onClick={handleStart} disabled={loading} size="sm">
                {loading ? "Starting…" : `Start at Table #${n}`}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const MenuPage = () => {
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotalPrice, getTotalItems } = useCart();
  const { placeOrder } = useOrders();
  const { tableNumber, hasTicket } = useCustomerSession();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [paymentQR, setPaymentQR] = useState(null);

  const { data: menuData, isLoading, error, refetch } = useQuery({
    queryKey: ["menu"],
    queryFn: () => menuApi.list(),
  });
  const menuItems = menuData?.items || [];

  const handleAddToCart = (item) => {
    addItem({ id: item._id, name: item.name, price: item.price });
    toast({ title: "Added to cart", description: `${item.name} added.` });
  };

  const handleConfirmOrder = () => {
    if (!hasTicket) {
      toast({ title: "Pick a table first", description: "Start a session at the top of the menu page.", variant: "destructive" });
      return;
    }
    setCheckoutStep("confirm");
  };

  const handleProceedToPayment = async () => {
    setCheckoutStep("payment");
    setPaymentQR(null);
  };

  const handleCompletePayment = async () => {
    setIsProcessing(true);
    try {
      const order = await placeOrder(items);
      setCurrentOrderId(order.orderId);

      try {
        const intent = await stripeApi.createPaymentIntent({
          order_id: order.orderId,
          currency: "usd",
          table_number: tableNumber,
        });
        setPaymentQR(intent.qr_code_base64 || null);
        if (intent.simulated && intent.payment_url) {
          await stripeApi.simulate(order.orderId, order.totalPrice).catch(() => {});
        }
      } catch (err) {
        console.warn("[Menu] Payment-intent step failed:", err.message);
      }

      clearCart();
      setCheckoutStep("success");
    } catch (err) {
      toast({ title: "Order failed", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseCheckout = () => {
    setIsCartOpen(false);
    setCheckoutStep("cart");
    setCurrentOrderId(null);
    setPaymentQR(null);
  };

  const handleViewOrders = () => { handleCloseCheckout(); navigate("/orders"); };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 glass-morphism border-b border-border"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-gradient-primary">3D AR Menu</h1>
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <ShoppingCart className="w-4 h-4" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="glass-morphism border-l-2 border-primary/30 w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle className="text-gradient-primary">Your Cart</SheetTitle>
                <SheetDescription>
                  {getTotalItems()} {getTotalItems() === 1 ? "item" : "items"} in your cart
                </SheetDescription>
              </SheetHeader>
              <div className="mt-8 space-y-4">
                {items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                      {items.map((item) => (
                        <Card key={item.id} className="glass-morphism p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-semibold">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={() => removeItem(item.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 text-right font-bold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </Card>
                      ))}
                    </div>
                    <div className="border-t border-border pt-4 space-y-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-gradient-primary">${getTotalPrice().toFixed(2)}</span>
                      </div>
                      <Button variant="hero" size="lg" className="w-full" onClick={handleConfirmOrder}>
                        Confirm Order
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/orders">
            <Button variant="ghost" size="sm">
              <ClipboardList className="w-4 h-4 mr-2" />
              Orders
            </Button>
          </Link>
        </div>
      </motion.header>

      <TableBootstrap />

      {/* Confirmation Dialog */}
      <Dialog open={checkoutStep === "confirm"} onOpenChange={(open) => !open && setCheckoutStep("cart")}>
        <DialogContent className="glass-morphism border-2 border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-gradient-primary flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Confirm Your Order
            </DialogTitle>
            <DialogDescription>Please review your order before paying</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <span>{item.quantity}x {item.name}</span>
                <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-4 flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-gradient-primary">${getTotalPrice().toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCheckoutStep("cart")}>Back to Cart</Button>
            <Button variant="hero" className="flex-1" onClick={handleProceedToPayment}>
              <CreditCard className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={checkoutStep === "payment"} onOpenChange={(open) => !open && setCheckoutStep("confirm")}>
        <DialogContent className="glass-morphism border-2 border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-gradient-primary flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Complete Payment
            </DialogTitle>
            <DialogDescription>Tap to place the order. We'll generate a payment QR.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center my-6">
            <p className="text-2xl font-bold text-gradient-primary mb-4">${getTotalPrice().toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Table #{tableNumber || "—"}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCheckoutStep("confirm")}>Back</Button>
            <Button variant="hero" className="flex-1" onClick={handleCompletePayment} disabled={isProcessing}>
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
              ) : (
                "Place Order"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={checkoutStep === "success"} onOpenChange={(open) => !open && handleCloseCheckout()}>
        <DialogContent className="glass-morphism border-2 border-green-500/30 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mx-auto mb-4"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
          </motion.div>
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-gradient-primary">Order Placed Successfully!</DialogTitle>
            <DialogDescription className="text-center">Your order has been confirmed and is being prepared</DialogDescription>
          </DialogHeader>
          <div className="my-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Your Order Number</p>
            <p className="text-2xl font-bold text-gradient-primary">{currentOrderId}</p>
            {paymentQR && (
              <img
                src={`data:image/png;base64,${paymentQR}`}
                alt="Payment QR"
                className="mx-auto mt-4 rounded-lg w-48 h-48 bg-white p-2"
              />
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCloseCheckout}>Continue Browsing</Button>
            <Button variant="hero" className="flex-1" onClick={handleViewOrders}>
              <ClipboardList className="w-4 h-4 mr-2" />
              View My Orders
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* 3D Viewer Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">
              Interactive <span className="text-gradient-primary">3D Preview</span>
            </h2>
            <p className="text-muted-foreground">Explore our dishes in stunning 3D detail before ordering</p>
          </div>
          <MenuScene />
        </motion.section>

        {/* Menu Items Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold mb-6">Menu Selection</h2>

          {isLoading && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading menu…
            </div>
          )}

          {error && !isLoading && (
            <Card className="p-6 text-center border-destructive/50">
              <p className="text-destructive font-semibold mb-2">Couldn't load the menu</p>
              <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
              <Button onClick={() => refetch()} variant="outline">Retry</Button>
            </Card>
          )}

          {!isLoading && !error && menuItems.length === 0 && (
            <Card className="p-12 text-center text-muted-foreground">No menu items available right now.</Card>
          )}

          {!isLoading && !error && menuItems.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item, idx) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="glass-morphism border-2 border-border hover:border-primary/50 transition-all overflow-hidden group h-full flex flex-col">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={item.image_url || dishImage}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                      <div className="absolute top-2 right-2 px-3 py-1 bg-primary/90 text-primary-foreground text-xs font-semibold rounded-full">
                        {item.category}
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{item.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4 flex-1">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-gradient-primary">${Number(item.price).toFixed(2)}</span>
                        <Button
                          variant="glow"
                          size="sm"
                          disabled={!item.is_available}
                          onClick={() => handleAddToCart(item)}
                        >
                          <Plus className="w-4 h-4" />
                          {item.is_available ? "Add to Cart" : "Out"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
};

export default MenuPage;
