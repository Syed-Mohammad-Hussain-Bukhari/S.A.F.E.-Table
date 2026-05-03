import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Trash2, Edit, UserPlus, Mail, Phone, User as UserIcon, Briefcase, ShieldBan, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import { toast } from "sonner";

const StaffPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { approvedUsers, signup, approveUser, updateProfile, deleteUser, toggleUserStatus } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [staffToDelete, setStaffToDelete] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    role: "server",
    email: "",
    username: "",
    phone: "",
    pin: "123456"
  });

  const filteredStaff = approvedUsers.filter((member) =>
  member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
  member.username && member.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: "", role: "server", email: "", username: "", phone: "", pin: "123456" });
    setIsDialogOpen(true);
  };

  const handleEdit = (member) => {
    setEditingId(member.id);
    setFormData({
      name: member.name,
      role: member.role,
      email: member.email || "",
      username: member.username || "",
      phone: member.phone || "",
      pin: member.pin || "" // Keep existing PIN if not changed
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.username) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editingId) {
      // Update
      updateProfile(editingId, {
        name: formData.name,
        role: formData.role,
        email: formData.email,
        username: formData.username,
        phone: formData.phone
      });
      toast.success("Staff profile updated");
    } else {
      // Add New
      const result = signup(
        formData.name,
        formData.email,
        formData.username,
        formData.phone,
        formData.pin,
        formData.role,
        'approved' // Automatically approve admin-created users
      );

      if (result.success && result.user) {
        toast.success("Staff member added successfully");
      } else {
        toast.error(result.message || "Failed to add staff");
        return; // Don't close dialog on error
      }
    }

    setIsDialogOpen(false);
    setEditingId(null);
  };

  const handleDelete = () => {
    if (staffToDelete) {
      deleteUser(staffToDelete);
      toast.success("Staff member removed");
      setStaffToDelete(null);
    }
  };

  const handleToggleStatus = (member) => {
    const isInactive = member.status === 'suspended' || member.status === 'locked';
    const newStatus = isInactive ? 'approved' : 'suspended';
    toggleUserStatus(member.id, newStatus);
    
    if (member.status === 'locked') {
      toast.success("Account unlocked and activated");
    } else {
      toast.success(`User ${newStatus === 'suspended' ? 'suspended' : 'activated'}`);
    }
  };

  return (
    <div className="space-y-8 text-foreground">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gradient-primary">Staff Management</h1>
                    <p className="text-muted-foreground">Manage your restaurant team members.</p>
                </div>

                <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add Staff
                </Button>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="bg-card border-border text-card-foreground">
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                {editingId ? "Update the details of the employee." : "Enter the details of the new employee."}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-foreground">Full Name</Label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-9 bg-input border-input focus:border-primary"
                      placeholder="John Doe" />
                    
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-foreground">Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-9 bg-input border-input focus:border-primary"
                      placeholder="+1 (555) 000-0000" />
                    
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-foreground">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-9 bg-input border-input focus:border-primary"
                      placeholder="john@example.com" />
                    
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="text-foreground">Username</Label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="pl-9 bg-input border-input focus:border-primary"
                      placeholder="johndoe" />
                    
                                    </div>
                                </div>
                            </div>

                            {!editingId &&
                            <div className="space-y-2">
                                <Label htmlFor="pin" className="text-foreground">Access Code (6 Characters)</Label>
                                <Input
                                    id="pin"
                                    value={formData.pin}
                                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                                    className="bg-input border-input focus:border-primary"
                                    placeholder="SAFE01"
                                    maxLength={6} />
                            </div>
                            }

                            <div className="space-y-2">
                                <Label htmlFor="role" className="text-foreground">Role</Label>
                                <div className="relative">
                                    <Briefcase className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground z-10" />
                                    <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    
                                        <SelectTrigger className="pl-9 bg-input border-input">
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-border text-popover-foreground">
                                            <SelectItem value="manager">Manager</SelectItem>
                                            <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                                            <SelectItem value="server">Server Staff</SelectItem>
                                            <SelectItem value="cleaner">Cleaner</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-border hover:bg-muted text-muted-foreground">Cancel</Button>
                            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                {editingId ? "Update Member" : "Add Member"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !open && setStaffToDelete(null)}>
                    <AlertDialogContent className="bg-card border-border text-card-foreground">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                                This action cannot be undone. This will permanently remove the staff member from the database.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {/* Active Staff Section */}
            <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Active Staff Members</h2>

                <Card className="p-4 bg-card border-border">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                type="search"
                placeholder="Search staff..."
                className="pl-9 bg-input border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} />
              
                        </div>
                    </div>

                    <div className="rounded-md border border-border">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="border-border hover:bg-muted/50">
                                    <TableHead className="text-muted-foreground">Name</TableHead>
                                    <TableHead className="text-muted-foreground">Role</TableHead>
                                    <TableHead className="text-muted-foreground">Email / Username</TableHead>
                                    <TableHead className="text-muted-foreground">Phone</TableHead>
                                    <TableHead className="text-muted-foreground">Status</TableHead>
                                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStaff.map((member) =>
                <TableRow key={member.id} className="border-border hover:bg-muted/50">
                                        <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                                        <TableCell className="text-muted-foreground capitalize">{member.role}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            <div className="flex flex-col">
                                                <span>{member.email}</span>
                                                <span className="text-xs text-muted-foreground/70">@{member.username}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{member.phone || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                member.status === 'locked' ? 'text-orange-500 border-orange-500/20 bg-orange-500/10 animate-pulse' :
                                                member.status === 'suspended' ? 'text-destructive border-destructive/20 bg-destructive/10' :
                                                'text-green-500 border-green-500/20 bg-green-500/10'
                                                }>
                                                {member.status === 'locked' ? 'Locked (5 Strikes)' : 
                                                 member.status === 'suspended' ? 'Suspended' : 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title={member.status === 'locked' ? "Unlock Account" : member.status === 'suspended' ? "Activate" : "Suspend"}
                                                    className={`h-8 w-8 ${member.status === 'locked' ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-500/10' : member.status === 'suspended' ? 'text-green-500 hover:text-green-600 hover:bg-green-500/10' : 'text-orange-500 hover:text-orange-600 hover:bg-orange-500/10'}`}
                                                    onClick={() => handleToggleStatus(member)}>
                                                    
                                                    {member.status === 'locked' ? <ShieldCheck className="w-4 h-4 shadow-[0_0_8px_rgba(249,115,22,0.4)]" /> : 
                                                     member.status === 'suspended' ? <ShieldCheck className="w-4 h-4" /> : 
                                                     <ShieldBan className="w-4 h-4" />}
                                                </Button>
                                                <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-purple-500/10"
                        onClick={() => handleEdit(member)}>
                        
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setStaffToDelete(member.id)}>
                        
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                )}
                                {filteredStaff.length === 0 &&
                <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No active staff members found.
                                        </TableCell>
                                    </TableRow>
                }
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </div>);

};

export default StaffPage;