import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ChefHat, Mail, User, Phone, ArrowLeft, ArrowRight, Sparkles, ConciergeBell, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const handleNext = () => {
    if (!name || !phone) {
      toast.error("Please fill in all identity details.");
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSignup = (e) => {
    e.preventDefault();

    if (pin !== confirmPin) {
      toast.error("Access Codes do not match");
      return;
    }

    if (pin.length !== 6) {
      toast.error("Access Code must be 6 digits");
      return;
    }

    const result = signup(name, email, username, phone, pin, role);

    if (result.success) {
      toast.success("Signup request sent! Please wait for admin approval.");
      navigate('/login');
    } else {
      toast.error(result.message || "Signup failed");
    }
  };

  const getRoleTheme = (currentRole) => {
    if (currentRole === 'kitchen' || currentRole === 'server') return 'orange';
    if (currentRole === 'cleaner') return 'purple';
    if (currentRole === 'manager') return 'teal';
    return 'orange';
  };

  const getInputClassName = () => {
    const base = "pl-10 h-14 bg-input border-border text-foreground placeholder:text-muted-foreground transition-all duration-300 focus-visible:ring-1 focus-visible:ring-offset-0 rounded-xl";
    const theme = getRoleTheme(role);

    switch (theme) {
      case 'orange':return `${base} focus-visible:border-orange-500 focus-visible:ring-orange-500 selection:bg-orange-500/30 hover:border-orange-500/50`;
      case 'purple':return `${base} focus-visible:border-purple-500 focus-visible:ring-purple-500 selection:bg-purple-500/30 hover:border-purple-500/50`;
      case 'teal':return `${base} focus-visible:border-teal-500 focus-visible:ring-teal-500 selection:bg-teal-500/30 hover:border-teal-500/50`;
      default:return base;
    }
  };

  const getSlotStyling = (currentRole) => {
    const baseClass = "flex-shrink-0 w-9 h-12 text-2xl sm:w-11 sm:h-14 sm:text-3xl md:w-12 md:h-16 md:text-3xl font-black rounded-xl sm:rounded-2xl border-2 bg-background/50 backdrop-blur-xl shadow-inner outline-none overflow-hidden text-muted-foreground/30 transition-all duration-300";
    
    let borderColors = "";
    let activeClass = "";
    let hasValueClass = "";

    switch (currentRole) {
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

  const theme = getRoleTheme(role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[100px]" />
            </div>

            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-5 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-24 items-center z-10 relative">

                {/* Left Side: Branding */}
                <div className="md:col-span-2 lg:col-span-1 text-center md:text-left space-y-6 order-2 md:order-1">
                    <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden md:block"
            key={role || 'default'}
          >
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6 transition-colors duration-300
                            ${theme === 'orange' ?
            'bg-orange-500/10 border-orange-500/20 text-orange-500' :
            theme === 'purple' ?
            'bg-purple-500/10 border-purple-500/20 text-purple-500' :
            'bg-teal-500/10 border-teal-500/20 text-teal-500'}`}>
              
                            {role === 'kitchen' ? <ChefHat className="w-4 h-4" /> : role === 'cleaner' ? <Sparkles className="w-4 h-4" /> : role === 'server' ? <ConciergeBell className="w-4 h-4" /> : role === 'manager' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            <span className="text-sm font-medium">
                                {role === 'kitchen' ? "Join the Kitchen Team" : role === 'cleaner' ? "Join the Service Team" : role === 'server' ? "Join the Server Team" : role === 'manager' ? "Join the Management Team" : "Join S.A.F.E. Team"}
                            </span>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-4 leading-tight">
                            <span className="text-foreground">Master the</span> <br />
                            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme === 'orange' ? 'from-orange-500 to-red-600' : theme === 'purple' ? 'from-purple-500 to-indigo-600' : 'from-teal-500 to-cyan-600'}`}>
                                {role === 'kitchen' ? "Culinary Art" : role === 'cleaner' ? "Art of Service" : role === 'server' ? "Art of Hospitality" : role === 'manager' ? "Art of Management" : "Art of Excellence"}
                            </span>
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-sm">
                            {role === 'kitchen' ?
              "Join our elite kitchen staff. Streamline orders, manage inventory, and deliver excellence with S.A.F.E." :
              role === 'cleaner' ?
              "Join our dedicated service staff. Maintain standards, manage requests, and ensure a pristine environment." :
              role === 'server' ?
              "Join our exceptional server team. Deliver outstanding service, manage orders, and create memorable dining experiences." :
              "Join our management team. Oversee operations, coordinate staff, and ensure seamless service excellence."}
                        </p>
                    </motion.div>
                </div>

                {/* Right Side: Signup Form Wizard */}
                <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="order-1 md:order-2 md:col-span-3 lg:col-span-1 w-full max-w-md md:max-w-none mx-auto">
          
                    <Card className={`bg-card border-border p-6 shadow-2xl relative overflow-hidden transition-all duration-300 ${role ? 'md:p-8 min-h-[500px] flex flex-col' : 'md:p-10 lg:p-14 group'}`}>
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r transition-colors duration-500 ${theme === 'orange' ? 'from-orange-500 to-red-600' : theme === 'purple' ? 'from-purple-500 to-indigo-600' : 'from-teal-500 to-cyan-600'}`} />

                        {!role ? (
                            <div className="space-y-6 relative z-10">
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">Select Department</h2>
                                    <p className="text-muted-foreground mt-2 text-lg font-medium">Choose your team to request access</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Button
                                        variant="outline"
                                        className="h-28 sm:h-32 flex flex-col items-center justify-center gap-3 border-2 border-input/50 bg-card/60 backdrop-blur-md hover:bg-orange-500/10 hover:border-orange-500 hover:text-orange-500 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:-translate-y-1 transition-all duration-300 group rounded-2xl"
                                        onClick={() => setRole('kitchen')}
                                    >
                                        <div className="p-3 sm:p-4 rounded-xl bg-orange-500/5 group-hover:bg-orange-500/20 transition-colors">
                                            <ChefHat className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500/80 group-hover:text-orange-500" />
                                        </div>
                                        <span className="font-extrabold text-lg sm:text-xl">Kitchen</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-28 sm:h-32 flex flex-col items-center justify-center gap-3 border-2 border-input/50 bg-card/60 backdrop-blur-md hover:bg-purple-500/10 hover:border-purple-500 hover:text-purple-500 hover:shadow-[0_0_30px_rgba(147,51,234,0.2)] hover:-translate-y-1 transition-all duration-300 group rounded-2xl"
                                        onClick={() => setRole('cleaner')}
                                    >
                                        <div className="p-3 sm:p-4 rounded-xl bg-purple-500/5 group-hover:bg-purple-500/20 transition-colors">
                                            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-purple-500/80 group-hover:text-purple-500" />
                                        </div>
                                        <span className="font-extrabold text-lg sm:text-xl">Cleaning</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-28 sm:h-32 flex flex-col items-center justify-center gap-3 border-2 border-input/50 bg-card/60 backdrop-blur-md hover:bg-amber-500/10 hover:border-amber-500 hover:text-amber-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:-translate-y-1 transition-all duration-300 group rounded-2xl"
                                        onClick={() => setRole('server')}
                                    >
                                        <div className="p-3 sm:p-4 rounded-xl bg-amber-500/5 group-hover:bg-amber-500/20 transition-colors">
                                            <ConciergeBell className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500/80 group-hover:text-amber-500" />
                                        </div>
                                        <span className="font-extrabold text-lg sm:text-xl">Server</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-28 sm:h-32 flex flex-col items-center justify-center gap-3 border-2 border-input/50 bg-card/60 backdrop-blur-md hover:bg-teal-500/10 hover:border-teal-500 hover:text-teal-500 hover:shadow-[0_0_30px_rgba(20,184,166,0.2)] hover:-translate-y-1 transition-all duration-300 group rounded-2xl"
                                        onClick={() => setRole('manager')}
                                    >
                                        <div className="p-3 sm:p-4 rounded-xl bg-teal-500/5 group-hover:bg-teal-500/20 transition-colors">
                                            <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-teal-500/80 group-hover:text-teal-500" />
                                        </div>
                                        <span className="font-extrabold text-lg sm:text-xl">Manager</span>
                                    </Button>
                                </div>
                                <div className="text-center pt-6 mt-4 border-t border-border/50">
                                    <Link to="/login" className="text-sm sm:text-base font-semibold hover:underline transition-colors text-muted-foreground hover:text-foreground">
                                        Back to Login Portal
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="mb-2 flex justify-between items-start z-10 border-b border-border/50 pb-4">
                                    <div className="flex gap-4 items-center">
                                        <motion.div 
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border-4 shadow-sm transition-all duration-500 ${
                                                role === 'kitchen' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                                                role === 'cleaner' ? 'bg-purple-500/10 border-purple-500/20 text-purple-500' :
                                                role === 'server' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                role === 'manager' ? 'bg-teal-500/10 border-teal-500/20 text-teal-500' :
                                                'bg-primary/10 border-primary/20 text-primary'
                                        }`}>
                                            {role === 'kitchen' ? <ChefHat className="w-6 h-6 sm:w-8 sm:h-8" /> :
                                            role === 'cleaner' ? <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" /> :
                                            role === 'server' ? <ConciergeBell className="w-6 h-6 sm:w-8 sm:h-8" /> :
                                            <Building2 className="w-6 h-6 sm:w-8 sm:h-8" />}
                                        </motion.div>
                                        <div>
                                            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-0.5 capitalize">{role} <span className="opacity-40">Signup</span></h2>
                                            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Step {step} of 2</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={`transition-all duration-300 rounded-xl hidden sm:flex border-2 border-transparent ${
                                            theme === 'orange' ? 'text-orange-500 hover:bg-orange-500/10 hover:border-orange-500/30' : 
                                            theme === 'purple' ? 'text-purple-500 hover:bg-purple-500/10 hover:border-purple-500/30' : 
                                            'text-teal-500 hover:bg-teal-500/10 hover:border-teal-500/30'
                                        }`}
                                        onClick={() => setRole(null)}>
                                        <ArrowLeft className="w-4 h-4 mr-1" />
                                        Switch Role
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="sm:hidden text-muted-foreground"
                                        onClick={() => setRole(null)}>
                                        <ArrowLeft className="w-5 h-5" />
                                    </Button>
                                </div>

                                <div className="flex-1 relative pt-4">
                                    <AnimatePresence mode="wait">
                                        {step === 1 && (
                                            <motion.div
                                                key="step1"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ duration: 0.3 }}
                                                className="h-full flex flex-col justify-between"
                                            >
                                                <div className="space-y-5">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="name" className="text-foreground font-bold tracking-wide uppercase text-xs opacity-70">1. Full Legal Name</Label>
                                                        <div className="relative">
                                                            <User className="absolute left-3 top-4 h-5 w-5 text-muted-foreground" />
                                                            <Input
                                                                id="name"
                                                                value={name}
                                                                onChange={(e) => setName(e.target.value)}
                                                                placeholder="Jane Doe"
                                                                className={getInputClassName()}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="phone" className="text-foreground font-bold tracking-wide uppercase text-xs opacity-70">2. Contact Phone</Label>
                                                        <div className="relative">
                                                            <Phone className="absolute left-3 top-4 h-5 w-5 text-muted-foreground" />
                                                            <Input
                                                                id="phone"
                                                                type="tel"
                                                                value={phone}
                                                                onChange={(e) => setPhone(e.target.value)}
                                                                placeholder="+1 (555) 000-0000"
                                                                className={getInputClassName()}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button
                                                    type="button"
                                                    onClick={handleNext}
                                                    className={`w-full mt-8 h-14 text-white text-lg font-bold shadow-lg 
                                                        ${theme === 'orange' ? 'bg-orange-500 shadow-orange-500/20 hover:shadow-orange-500/40 hover:bg-orange-600' :
                                                        theme === 'purple' ? 'bg-purple-600 shadow-purple-500/20 hover:shadow-purple-500/40 hover:bg-purple-700' :
                                                        'bg-teal-600 shadow-teal-500/20 hover:shadow-teal-500/40 hover:bg-teal-700'}`}>
                                                    Continue to Security <ArrowRight className="w-5 h-5 ml-2" />
                                                </Button>
                                            </motion.div>
                                        )}

                                        {step === 2 && (
                                            <motion.div
                                                key="step2"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.3 }}
                                                className="h-full flex flex-col justify-between"
                                            >
                                                <div className="space-y-5">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="email" className="text-foreground font-bold tracking-wide uppercase text-xs opacity-70">3. Email Address</Label>
                                                        <div className="relative">
                                                            <Mail className="absolute left-3 top-4 h-5 w-5 text-muted-foreground" />
                                                            <Input
                                                                id="email"
                                                                type="email"
                                                                value={email}
                                                                onChange={(e) => setEmail(e.target.value)}
                                                                placeholder="staff@safe.com"
                                                                className={getInputClassName()}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="username" className="text-foreground font-bold tracking-wide uppercase text-xs opacity-70">4. System Identifier (Username)</Label>
                                                        <div className="relative">
                                                            <User className="absolute left-3 top-4 h-5 w-5 text-muted-foreground" />
                                                            <Input
                                                                id="username"
                                                                value={username}
                                                                onChange={(e) => setUsername(e.target.value)}
                                                                placeholder="staff_jane"
                                                                className={getInputClassName()}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="pin" className="text-foreground font-bold tracking-wide uppercase text-xs opacity-70 text-center block">5. Secure Access Code (6 digits)</Label>
                                                        <div className="flex justify-center pt-1">
                                                            <InputOTP
                                                                maxLength={6}
                                                                value={pin}
                                                                onChange={(value) => setPin(value)}
                                                            >
                                                                <div className="flex flex-row items-center justify-center gap-1 sm:gap-2 md:gap-3 p-2 sm:p-3 rounded-2xl sm:rounded-3xl bg-card/30 backdrop-blur-sm border border-border/50 shadow-2xl w-full max-w-sm mx-auto">
                                                                    <InputOTPGroup className="gap-1 sm:gap-1.5 md:gap-2">
                                                                        {[0, 1, 2].map((i) => (
                                                                            <InputOTPSlot
                                                                                key={i}
                                                                                index={i}
                                                                                {...getSlotStyling(role)}
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
                                                                                {...getSlotStyling(role)}
                                                                            />
                                                                        ))}
                                                                    </InputOTPGroup>
                                                                </div>
                                                            </InputOTP>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="confirmPin" className="text-foreground font-bold tracking-wide uppercase text-xs opacity-70 text-center block">6. Confirm Access Code</Label>
                                                        <div className="flex justify-center pt-1">
                                                            <InputOTP
                                                                maxLength={6}
                                                                value={confirmPin}
                                                                onChange={(value) => setConfirmPin(value)}
                                                            >
                                                                <div className="flex flex-row items-center justify-center gap-1 sm:gap-2 md:gap-3 p-2 sm:p-3 rounded-2xl sm:rounded-3xl bg-card/30 backdrop-blur-sm border border-border/50 shadow-2xl w-full max-w-sm mx-auto">
                                                                    <InputOTPGroup className="gap-1 sm:gap-1.5 md:gap-2">
                                                                        {[0, 1, 2].map((i) => (
                                                                            <InputOTPSlot
                                                                                key={i}
                                                                                index={i}
                                                                                {...getSlotStyling(role)}
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
                                                                                {...getSlotStyling(role)}
                                                                            />
                                                                        ))}
                                                                    </InputOTPGroup>
                                                                </div>
                                                            </InputOTP>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3 mt-8">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleBack}
                                                        className={`flex-1 h-14 rounded-2xl text-base font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-2 ${
                                                            theme === 'orange' ? 'border-orange-500/30 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]' :
                                                            theme === 'purple' ? 'border-purple-500/30 text-purple-500 hover:bg-purple-500/10 hover:border-purple-500 hover:shadow-[0_0_20px_rgba(147,51,234,0.2)]' :
                                                            'border-teal-500/30 text-teal-500 hover:bg-teal-500/10 hover:border-teal-500 hover:shadow-[0_0_20px_rgba(20,184,166,0.2)]'
                                                        }`}>
                                                        <ArrowLeft className="w-5 h-5 mr-1 inline-block" /> Back
                                                    </Button>
                                                    <Button
                                                        onClick={handleSignup}
                                                        className={`flex-[2] h-14 text-white text-lg font-bold shadow-lg 
                                                            ${theme === 'orange' ? 'bg-orange-500 shadow-orange-500/20 hover:shadow-orange-500/40 hover:bg-orange-600' :
                                                            theme === 'purple' ? 'bg-purple-600 shadow-purple-500/20 hover:shadow-purple-500/40 hover:bg-purple-700' :
                                                            'bg-teal-600 shadow-teal-500/20 hover:shadow-teal-500/40 hover:bg-teal-700'}`}>
                                                        Submit Request
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </Card>
                </motion.div>
            </div>
        </div>
  );
};

export default SignupPage;
