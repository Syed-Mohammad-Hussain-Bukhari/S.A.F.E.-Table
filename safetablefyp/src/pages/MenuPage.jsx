import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, CreditCard, ClipboardList } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import MenuScene from "@/components/MenuScene";
import dishImage from "@/assets/dish-steak.jpg";
import { useTables } from "@/hooks/useTables";
import { useCart } from "@/hooks/useCart";
import { useOrders } from "@/hooks/useOrders";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription } from
"@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription } from
"@/components/ui/dialog";

const menuItems = [
{
  id: 1,
  name: "Wagyu Beef Steak",
  description: "Premium A5 wagyu beef, perfectly seared with truffle butter and seasonal vegetables",
  price: 45.99,
  category: "Main Course"
},
{
  id: 2,
  name: "Lobster Thermidor",
  description: "Fresh Atlantic lobster with creamy Gruyère sauce and herb-crusted top",
  price: 38.99,
  category: "Main Course"
},
{
  id: 3,
  name: "Truffle Risotto",
  description: "Arborio rice with black truffle, parmigiano-reggiano, and wild mushrooms",
  price: 24.99,
  category: "Main Course"
},
{
  id: 4,
  name: "Caesar Salad",
  description: "Crisp romaine lettuce, garlic croutons, parmesan, and house-made Caesar dressing",
  price: 14.99,
  category: "Starter"
},
{
  id: 5,
  name: "Crème Brûlée",
  description: "Classic French vanilla custard with a caramelized sugar crust",
  price: 12.99,
  category: "Dessert"
},
{
  id: 6,
  name: "Sushi Platter",
  description: "Assorted nigiri and maki rolls with fresh wasabi and pickled ginger",
  price: 32.99,
  category: "Main Course"
}];


const MenuPage = () => {
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotalPrice, getTotalItems } = useCart();
  const { addOrder, tableNumber } = useOrders();
  const { updateStatus } = useTables();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  const handleAddToCart = (item) => {
    addItem(item);
    toast({
      title: "Added to Cart",
      description: `${item.name} has been added to your cart.`
    });
  };

  const handleConfirmOrder = () => {
    setCheckoutStep('confirm');
  };

  const handleProceedToPayment = () => {
    setCheckoutStep('payment');
  };

  const handleCompletePayment = () => {
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      const order = addOrder(items, getTotalPrice());
      updateStatus(tableNumber, 'occupied'); // Auto-occupy table
      setCurrentOrderId(order.orderId);
      clearCart();
      setIsProcessing(false);
      setCheckoutStep('success');
    }, 1500);
  };

  const handleCloseCheckout = () => {
    setIsCartOpen(false);
    setCheckoutStep('cart');
    setCurrentOrderId(null);
  };

  const handleViewOrders = () => {
    handleCloseCheckout();
    navigate('/orders');
  };

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
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>

          <h1 className="text-xl font-bold text-gradient-primary">3D AR Menu</h1>

          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <ShoppingCart className="w-4 h-4" />
                {getTotalItems() > 0 &&
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                }
              </Button>
            </SheetTrigger>
            <SheetContent className="glass-morphism border-l-2 border-primary/30 w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle className="text-gradient-primary">Your Cart</SheetTitle>
                <SheetDescription>
                  {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'} in your cart
                </SheetDescription>
              </SheetHeader>

              <div className="mt-8 space-y-4">
                {items.length === 0 ?
                <p className="text-center text-muted-foreground py-8">Your cart is empty</p> :

                <>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                      {items.map((item) =>
                    <Card key={item.id} className="glass-morphism p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-semibold">{item.quantity}</span>
                              <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2"
                            onClick={() => removeItem(item.id)}>
                            
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 text-right font-bold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </Card>
                    )}
                    </div>

                    <div className="border-t border-border pt-4 space-y-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-gradient-primary">${getTotalPrice().toFixed(2)}</span>
                      </div>

                      <Button
                      variant="hero"
                      size="lg"
                      className="w-full"
                      onClick={handleConfirmOrder}>
                      
                        Confirm Order
                      </Button>
                    </div>
                  </>
                }
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

      {/* Order Confirmation Dialog */}
      <Dialog open={checkoutStep === 'confirm'} onOpenChange={(open) => !open && setCheckoutStep('cart')}>
        <DialogContent className="glass-morphism border-2 border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-gradient-primary flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Confirm Your Order
            </DialogTitle>
            <DialogDescription>
              Please review your order before proceeding to payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {items.map((item) =>
            <div key={item.id} className="flex justify-between items-center">
                <span>{item.quantity}x {item.name}</span>
                <span className="font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-border pt-4 flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-gradient-primary">${getTotalPrice().toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCheckoutStep('cart')}>
              Back to Cart
            </Button>
            <Button variant="hero" className="flex-1" onClick={handleProceedToPayment}>
              <CreditCard className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={checkoutStep === 'payment'} onOpenChange={(open) => !open && setCheckoutStep('confirm')}>
        <DialogContent className="glass-morphism border-2 border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-gradient-primary flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Complete Payment
            </DialogTitle>
            <DialogDescription>
              Scan QR code or tap to pay
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center my-6">
            {/* QR Code */}
            <div className="w-48 h-48 bg-white p-4 rounded-xl shadow-lg mb-4">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <rect x="10" y="10" width="25" height="25" fill="black" />
                <rect x="15" y="15" width="15" height="15" fill="white" />
                <rect x="18" y="18" width="9" height="9" fill="black" />
                <rect x="65" y="10" width="25" height="25" fill="black" />
                <rect x="70" y="15" width="15" height="15" fill="white" />
                <rect x="73" y="18" width="9" height="9" fill="black" />
                <rect x="10" y="65" width="25" height="25" fill="black" />
                <rect x="15" y="70" width="15" height="15" fill="white" />
                <rect x="18" y="73" width="9" height="9" fill="black" />
                <rect x="40" y="10" width="5" height="5" fill="black" />
                <rect x="50" y="15" width="5" height="5" fill="black" />
                <rect x="40" y="25" width="5" height="5" fill="black" />
                <rect x="45" y="40" width="10" height="10" fill="black" />
                <rect x="65" y="45" width="5" height="5" fill="black" />
                <rect x="75" y="50" width="5" height="5" fill="black" />
                <rect x="85" y="45" width="5" height="5" fill="black" />
                <rect x="45" y="55" width="5" height="5" fill="black" />
                <rect x="55" y="60" width="10" height="5" fill="black" />
                <rect x="70" y="65" width="5" height="5" fill="black" />
                <rect x="80" y="70" width="10" height="10" fill="black" />
                <rect x="45" y="75" width="5" height="5" fill="black" />
                <rect x="55" y="80" width="5" height="5" fill="black" />
                <rect x="65" y="85" width="5" height="5" fill="black" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gradient-primary mb-2">
              ${getTotalPrice().toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              Scan with your banking app or use NFC
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCheckoutStep('confirm')}>
              Back
            </Button>
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleCompletePayment}
              disabled={isProcessing}>
              
              {isProcessing ?
              <>
                  <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                
                  Processing...
                </> :

              'Complete Payment'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={checkoutStep === 'success'} onOpenChange={(open) => !open && handleCloseCheckout()}>
        <DialogContent className="glass-morphism border-2 border-green-500/30 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mx-auto mb-4">
            
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
          </motion.div>

          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-gradient-primary">
              Order Placed Successfully!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your order has been confirmed and is being prepared
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Your Order Number</p>
            <p className="text-2xl font-bold text-gradient-primary">{currentOrderId}</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCloseCheckout}>
              Continue Browsing
            </Button>
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
          className="mb-12">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">
              Interactive <span className="text-gradient-primary">3D Preview</span>
            </h2>
            <p className="text-muted-foreground">
              Explore our dishes in stunning 3D detail before ordering
            </p>
          </div>

          <MenuScene />
        </motion.section>

        {/* Menu Items Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}>
          
          <h2 className="text-2xl font-bold mb-6">Menu Selection</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item, idx) =>
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              whileHover={{ y: -5 }}>
              
                <Card className="glass-morphism border-2 border-border hover:border-primary/50 transition-all overflow-hidden group h-full flex flex-col">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                    src={dishImage}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  
                    <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
                    <div className="absolute top-2 right-2 px-3 py-1 bg-primary/90 text-primary-foreground text-xs font-semibold rounded-full">
                      {item.category}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 flex-1">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-gradient-primary">
                        ${item.price}
                      </span>
                      <Button
                      variant="glow"
                      size="sm"
                      onClick={() => handleAddToCart(item)}>
                      
                        <Plus className="w-4 h-4" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </motion.section>
      </main>
    </div>);

};

export default MenuPage;