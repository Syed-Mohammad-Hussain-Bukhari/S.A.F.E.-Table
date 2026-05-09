import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ChefHat, ShieldCheck, User, Sparkles, ConciergeBell, Building2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [password, setPassword] = useState("");
<<<<<<< HEAD
=======
  const [submitting, setSubmitting] = useState(false);
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)

  const [identifier, setIdentifier] = useState(""); // Email or Username

  const getSlotStyling = (role) => {
    const baseClass = "flex-shrink-0 w-9 h-12 text-2xl sm:w-11 sm:h-14 sm:text-3xl md:w-12 md:h-16 md:text-3xl font-black rounded-xl sm:rounded-2xl border-2 bg-background/50 backdrop-blur-xl shadow-inner outline-none overflow-hidden text-muted-foreground/30 transition-all duration-300";
    
    let borderColors = "";
    let activeClass = "";
    let hasValueClass = "";

    switch (role) {
        case 'kitchen':
            borderColors = "border-orange-500/20";
            activeClass = "border-orange-500 ring-4 ring-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.5)] -translate-y-2 bg-orange-500/5 text-orange-500 scale-[1.03]";
            hasValueClass = "border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.2)] text-orange-500 bg-orange-500/5 scale-[1.02]";
            break;
        case 'cleaner':
            borderColors = "border-purple-500/20";
            activeClass = "border-purple-500 ring-4 ring-purple-500/20 shadow-[0_0_30px_rgba(147,51,234,0.5)] -translate-y-2 bg-purple-500/5 text-purple-500 scale-[1.03]";
            hasValueClass = "border-purple-500/60 shadow-[0_0_20px_rgba(147,51,234,0.2)] text-purple-500 bg-purple-500/5 scale-[1.02]";
            break;
        case 'server':
            borderColors = "border-amber-500/20";
            activeClass = "border-amber-500 ring-4 ring-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.5)] -translate-y-2 bg-amber-500/5 text-amber-500 scale-[1.03]";
            hasValueClass = "border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)] text-amber-500 bg-amber-500/5 scale-[1.02]";
            break;
        case 'manager':
            borderColors = "border-teal-500/20";
            activeClass = "border-teal-500 ring-4 ring-teal-500/20 shadow-[0_0_30px_rgba(20,184,166,0.5)] -translate-y-2 bg-teal-500/5 text-teal-500 scale-[1.03]";
            hasValueClass = "border-teal-500/60 shadow-[0_0_20px_rgba(20,184,166,0.2)] text-teal-500 bg-teal-500/5 scale-[1.02]";
            break;
        default:
            borderColors = "border-primary/20";
            activeClass = "border-primary ring-4 ring-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.5)] -translate-y-2 bg-primary/5 text-primary scale-[1.03]";
            hasValueClass = "border-primary/60 shadow-[0_0_20px_rgba(var(--primary),0.2)] text-primary bg-primary/5 scale-[1.02]";
    }

    return { className: `${baseClass} ${borderColors}`, activeClassName: activeClass, hasValueClassName: hasValueClass };
  };

<<<<<<< HEAD
  const handleLogin = (e) => {
    e.preventDefault();

    if (selectedRole === 'kitchen') {
      if (!identifier.trim()) {
        toast.error("Please enter your Username or Email");
        return;
      }
      const result = login('kitchen', password, identifier); // Pass identifier
      if (result.success) {
        toast.success("Welcome, Chef!");
        navigate('/kitchen');
      } else {
        toast.error(result.message || "Login failed");
      }
    } else if (selectedRole === 'cleaner') {
      if (!identifier.trim()) {
        toast.error("Please enter your Username or Email");
        return;
      }
      const result = login('cleaner', password, identifier);
      if (result.success) {
        toast.success("Welcome!");
        navigate('/cleaner');
      } else {
        toast.error(result.message || "Login failed");
      }
    } else if (selectedRole === 'server') {
      if (!identifier.trim()) {
        toast.error("Please enter your Username or Email");
        return;
      }
      const result = login('server', password, identifier);
      if (result.success) {
        toast.success("Welcome, Server!");
        navigate('/server');
      } else {
        toast.error(result.message || "Login failed");
      }
    } else if (selectedRole === 'manager') {
      if (!identifier.trim()) {
        toast.error("Please enter your Username or Email");
        return;
      }
      const result = login('manager', password, identifier);
      if (result.success) {
        toast.success("Welcome, Manager!");
        navigate('/manager');
      } else {
        toast.error(result.message || "Login failed");
      }
    } else if (selectedRole === 'admin') {
      if (!identifier.trim()) {
        toast.error("Please enter your Username or Email");
        return;
      }
      const result = login('admin', password, identifier);
      if (result.success) {
        toast.success("Welcome, Admin!");
        navigate('/admin');
      } else {
        toast.error(result.message || "Login failed");
      }
=======
  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!selectedRole) return;
    if (!identifier.trim()) {
      toast.error("Please enter your Username or Email");
      return;
    }
    if (!password.trim()) {
      toast.error(selectedRole === "admin" ? "Please enter your password" : "Please enter your access code");
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(selectedRole, password, identifier);
      if (!result.success) {
        toast.error(result.message || "Login failed");
        return;
      }

      // Redirect based on the user's actual role from the backend.
      const me = result.user;
      const greetings = {
        admin: "Welcome, Admin!",
        manager: "Welcome, Manager!",
        kitchen: "Welcome, Chef!",
        server: "Welcome, Server!",
        cleaner: "Welcome!",
      };
      toast.success(greetings[me.role] || "Signed in");
      const dest = `/${me.role}`;
      navigate(dest, { replace: true });
    } finally {
      setSubmitting(false);
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[100px]" />
            </div>

            <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-5 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-32 items-center z-10 relative">

                {/* Left Side: Branding */}
                <div className="md:col-span-2 lg:col-span-1 text-center md:text-left space-y-6">
                    <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
            
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-sm font-medium">Secure Portal Access</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight">
            
                        <span className="text-gradient-primary">
                            S.A.F.E.
                        </span> <br />
                        <span className="text-foreground">
                            Staff Portal
                        </span>
                    </motion.h1>

                    <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg max-w-md">
            
                        Manage orders, track kitchen status, and oversee restaurant operations from one secure hub.
                    </motion.p>
                </div>

                {/* Right Side: Login Form */}
                <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-3 lg:col-span-1 w-full max-w-md md:max-w-none mx-auto">
          
                    <Card className="bg-card border-border p-6 md:p-8 lg:p-14 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        {!selectedRole ?
            <div className="space-y-6 relative z-10">
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">Select Portal</h2>
                                    <p className="text-muted-foreground mt-2 text-lg font-medium">Choose your authorized access level</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Button
                                        variant="outline"
                                        className="h-28 sm:h-32 flex flex-col items-center justify-center gap-3 border-2 border-input/50 bg-card/60 backdrop-blur-md hover:bg-orange-500/10 hover:border-orange-500 hover:text-orange-500 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:-translate-y-1 transition-all duration-300 group rounded-2xl"
                                        onClick={() => setSelectedRole('kitchen')}
                                    >
                                        <div className="p-3 sm:p-4 rounded-xl bg-orange-500/5 group-hover:bg-orange-500/20 transition-colors">
                                            <ChefHat className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500/80 group-hover:text-orange-500" />
                                        </div>
                                        <span className="font-extrabold text-lg sm:text-xl">Kitchen</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-28 sm:h-32 flex flex-col items-center justify-center gap-3 border-2 border-input/50 bg-card/60 backdrop-blur-md hover:bg-purple-500/10 hover:border-purple-500 hover:text-purple-500 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:-translate-y-1 transition-all duration-300 group rounded-2xl"
                                        onClick={() => setSelectedRole('cleaner')}
                                    >
                                        <div className="p-3 sm:p-4 rounded-xl bg-purple-500/5 group-hover:bg-purple-500/20 transition-colors">
                                            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-purple-500/80 group-hover:text-purple-500" />
                                        </div>
                                        <span className="font-extrabold text-lg sm:text-xl">Cleaning</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-28 sm:h-32 flex flex-col items-center justify-center gap-3 border-2 border-input/50 bg-card/60 backdrop-blur-md hover:bg-amber-500/10 hover:border-amber-500 hover:text-amber-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:-translate-y-1 transition-all duration-300 group rounded-2xl"
                                        onClick={() => setSelectedRole('server')}
                                    >
                                        <div className="p-3 sm:p-4 rounded-xl bg-amber-500/5 group-hover:bg-amber-500/20 transition-colors">
                                            <ConciergeBell className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500/80 group-hover:text-amber-500" />
                                        </div>
                                        <span className="font-extrabold text-lg sm:text-xl">Server</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-28 sm:h-32 flex flex-col items-center justify-center gap-3 border-2 border-input/50 bg-card/60 backdrop-blur-md hover:bg-teal-500/10 hover:border-teal-500 hover:text-teal-500 hover:shadow-[0_0_30px_rgba(20,184,166,0.2)] hover:-translate-y-1 transition-all duration-300 group rounded-2xl"
                                        onClick={() => setSelectedRole('manager')}
                                    >
                                        <div className="p-3 sm:p-4 rounded-xl bg-teal-500/5 group-hover:bg-teal-500/20 transition-colors">
                                            <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-teal-500/80 group-hover:text-teal-500" />
                                        </div>
                                        <span className="font-extrabold text-lg sm:text-xl">Manager</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="sm:col-span-2 h-24 sm:h-28 flex flex-row items-center justify-center gap-4 border-2 border-input/50 bg-card/60 backdrop-blur-md hover:bg-primary/10 hover:border-primary hover:text-primary hover:shadow-[0_0_30px_rgba(var(--primary),0.2)] hover:-translate-y-1 transition-all duration-300 group rounded-2xl"
                                        onClick={() => setSelectedRole('admin')}
                                    >
                                        <div className="p-3 rounded-xl bg-primary/5 group-hover:bg-primary/20 transition-colors">
                                            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-primary/80 group-hover:text-primary" />
                                        </div>
                                        <span className="font-extrabold text-xl sm:text-2xl tracking-wide">Administrator</span>
                                    </Button>

                                    <div className="sm:col-span-2 relative my-4">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t-2 border-border/50" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
                                            <span className="bg-card px-4 text-muted-foreground/60 backdrop-blur-sm">Or continue as</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        className="sm:col-span-2 w-full h-14 sm:h-16 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors rounded-2xl font-bold text-lg border-2 border-transparent hover:border-primary/20"
                                        onClick={() => navigate('/')}
                                    >
                                        <User className="w-6 h-6 mr-3" />
                                        Customer View
                                    </Button>
                                </div>
                            </div> :

            <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                                <div className="text-center mb-6 sm:mb-8">
                                    <motion.div 
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-4 sm:mb-5 border-4 shadow-2xl transition-all duration-500 ${
                                            selectedRole === 'kitchen' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 shadow-orange-500/20' :
                                            selectedRole === 'cleaner' ? 'bg-purple-500/10 border-purple-500/20 text-purple-500 shadow-purple-500/20' :
                                            selectedRole === 'server' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-amber-500/20' :
                                            selectedRole === 'manager' ? 'bg-teal-500/10 border-teal-500/20 text-teal-500 shadow-teal-500/20' :
                                            'bg-primary/10 border-primary/20 text-primary shadow-primary/20'
                                    }`}>
                                        {selectedRole === 'kitchen' ? <ChefHat className="w-10 h-10 sm:w-12 sm:h-12" /> :
                                        selectedRole === 'cleaner' ? <Sparkles className="w-10 h-10 sm:w-12 sm:h-12" /> :
                                        selectedRole === 'server' ? <ConciergeBell className="w-10 h-10 sm:w-12 sm:h-12" /> :
                                        selectedRole === 'manager' ? <Building2 className="w-10 h-10 sm:w-12 sm:h-12" /> :
                                        <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12" />}
                                    </motion.div>
                                    <h2 className="text-3xl sm:text-4xl font-black text-foreground capitalize tracking-tight mb-2">
                                        {selectedRole === 'kitchen' ? 'Kitchen Staff' :
                                        selectedRole === 'cleaner' ? 'Cleaning Staff' :
                                        selectedRole === 'server' ? 'Server Staff' :
                                        selectedRole === 'manager' ? 'Manager' :
                                        'Administrator'} <span className="opacity-50">Login</span>
                                    </h2>
                                    <p className="text-muted-foreground text-base sm:text-lg font-medium">
                                        Authorize your access to continue
                                    </p>
                                </div>

                                <div className="space-y-5 sm:space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="identifier" className="text-foreground text-sm font-bold uppercase tracking-widest ml-2 opacity-80">
                                            Email or Username
                                        </Label>
                                        <Input
                                            id="identifier"
                                            type="text"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            placeholder="Enter your credential"
                                            className={`h-12 sm:h-14 text-lg rounded-2xl bg-card/60 backdrop-blur-xl border-2 px-6 transition-all duration-300 focus-visible:ring-4 focus-visible:ring-offset-0 ${
                                                selectedRole === 'kitchen' ? 'focus-visible:border-orange-500 focus-visible:ring-orange-500/20 focus-visible:shadow-[0_0_20px_rgba(249,115,22,0.3)] selection:bg-orange-500/30' :
                                                selectedRole === 'cleaner' ? 'focus-visible:border-purple-500 focus-visible:ring-purple-500/20 focus-visible:shadow-[0_0_20px_rgba(147,51,234,0.3)] selection:bg-purple-500/30' :
                                                selectedRole === 'server' ? 'focus-visible:border-amber-500 focus-visible:ring-amber-500/20 focus-visible:shadow-[0_0_20px_rgba(245,158,11,0.3)] selection:bg-amber-500/30' :
                                                selectedRole === 'manager' ? 'focus-visible:border-teal-500 focus-visible:ring-teal-500/20 focus-visible:shadow-[0_0_20px_rgba(20,184,166,0.3)] selection:bg-teal-500/30' :
                                                'focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:shadow-[0_0_20px_rgba(var(--primary),0.3)]'
                                            }`}
                                            autoFocus
                                            autoComplete="off"
                                            required 
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between ml-2">
                                            <Label htmlFor="password" className="text-foreground text-sm font-bold uppercase tracking-widest opacity-80">
                                                {selectedRole === 'admin' ? 'Administrative Password' : 'Secure Access Code'}
                                            </Label>
                                        </div>
                                        {selectedRole === 'admin' ? (
                                            <Input
                                                id="password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Enter root password"
                                                className={`h-12 sm:h-14 text-lg rounded-2xl bg-card/60 backdrop-blur-xl border-2 px-6 transition-all duration-300 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:shadow-[0_0_20px_rgba(var(--primary),0.3)]`}
                                                autoComplete="new-password" 
                                            />
                                        ) : (
                                            <div className="flex justify-center pt-2">
                                                <InputOTP
                                                    maxLength={6}
                                                    value={password}
                                                    onChange={(value) => setPassword(value)}
                                                >
                                                    <div className="flex flex-row items-center justify-center gap-1 sm:gap-2 md:gap-3 p-2 sm:p-3 rounded-2xl sm:rounded-3xl bg-card/30 backdrop-blur-sm border border-border/50 shadow-2xl w-full max-w-sm mx-auto">
                                                        <InputOTPGroup className="gap-1 sm:gap-1.5 md:gap-2">
                                                            {[0, 1, 2].map((i) => (
                                                                <InputOTPSlot
                                                                    key={i}
                                                                    index={i}
                                                                    {...getSlotStyling(selectedRole)}
                                                                />
                                                            ))}
                                                        </InputOTPGroup>

                                                        <div className="flex items-center justify-center w-3 sm:w-4 md:w-6">
                                                            <div className="w-full h-1 sm:h-1.5 rounded-full bg-muted-foreground/30"></div>
                                                        </div>

                                                        <InputOTPGroup className="gap-1 sm:gap-1.5 md:gap-2">
                                                            {[3, 4, 5].map((i) => (
                                                                <InputOTPSlot
                                                                    key={i}
                                                                    index={i}
                                                                    {...getSlotStyling(selectedRole)}
                                                                />
                                                            ))}
                                                        </InputOTPGroup>
                                                    </div>
                                                </InputOTP>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 pt-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedRole(null);
                                                setPassword("");
                                                setIdentifier("");
                                            }}
                                            className={`flex-1 h-12 sm:h-14 rounded-2xl text-base font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-2 ${
                                                selectedRole === 'kitchen' ? 'border-orange-500/30 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]' :
                                                selectedRole === 'cleaner' ? 'border-purple-500/30 text-purple-500 hover:bg-purple-500/10 hover:border-purple-500 hover:shadow-[0_0_20px_rgba(147,51,234,0.2)]' :
                                                selectedRole === 'server' ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]' :
                                                selectedRole === 'manager' ? 'border-teal-500/30 text-teal-500 hover:bg-teal-500/10 hover:border-teal-500 hover:shadow-[0_0_20px_rgba(20,184,166,0.2)]' :
                                                'border-primary/30 text-primary hover:bg-primary/10 hover:border-primary hover:shadow-[0_0_20px_rgba(var(--primary),0.2)]'
                                            }`}>
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
<<<<<<< HEAD
                                            className={`flex-[2] h-12 sm:h-14 rounded-2xl text-base font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border shadow-xl ${
=======
                                            disabled={submitting}
                                            className={`flex-[2] h-12 sm:h-14 rounded-2xl text-base font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border shadow-xl disabled:opacity-60 disabled:cursor-not-allowed ${
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
                                                selectedRole === 'kitchen' ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-orange-500/40 border-orange-400/50' :
                                                selectedRole === 'cleaner' ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:shadow-purple-500/40 border-purple-400/50' :
                                                selectedRole === 'server' ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:shadow-amber-500/40 border-amber-400/50' :
                                                selectedRole === 'manager' ? 'bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-teal-500/40 border-teal-400/50' :
                                                'bg-gradient-to-r from-primary to-primary/80 hover:shadow-primary/40 border-primary/50'
                                            }`}>
<<<<<<< HEAD
                                            Authenticate Access
=======
                                            {submitting ? "Authenticating…" : "Authenticate Access"}
>>>>>>> 3cb3c76 (Update backend changes by Hashaam via Claude Code)
                                        </Button>
                                    </div>
                                </div>

                                {(selectedRole === 'kitchen' || selectedRole === 'cleaner') &&
                                    <div className="text-center pt-8 mt-4 border-t border-border/50">
                                        <Link to="/signup" className={`text-sm sm:text-base font-semibold hover:underline transition-colors ${selectedRole === 'kitchen' ? 'text-orange-500 hover:text-orange-400' : 'text-purple-500 hover:text-purple-400'}`}>
                                            New Staff Member? Register Here
                                        </Link>
                                    </div>
                                }

                                {selectedRole === 'server' &&
                                    <div className="text-center pt-8 mt-4 border-t border-border/50">
                                        <Link to="/signup" className="text-sm sm:text-base font-semibold text-amber-500 hover:text-amber-400 hover:underline transition-colors">
                                            New Server? Register Here
                                        </Link>
                                    </div>
                                }
                                {selectedRole === 'manager' &&
                                    <div className="text-center pt-8 mt-4 border-t border-border/50">
                                        <Link to="/signup" className="text-sm sm:text-base font-semibold text-teal-500 hover:text-teal-400 hover:underline transition-colors">
                                            New Manager? Register Here
                                        </Link>
                                    </div>
                                }
                            </form>
            }
                    </Card>
                </motion.div>
            </div>
        </div>);

};

export default LoginPage;