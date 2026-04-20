import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { UserAvatarUpload } from '@/components/sidebar/UserAvatarUpload';
import { Eye, EyeOff, User, Lock, Trash2, Mail, ShieldCheck, Download } from 'lucide-react';
import { TwoFactorVerification } from '@/components/auth/TwoFactorVerification';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';



const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const { profile, updateProfile, updateAvatarUrl } = useUserProfile();
  const { toast } = useToast();

  // Profile fields
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  // Delete account
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // 2FA
  const [show2FASetup, setShow2FASetup] = useState(() => sessionStorage.getItem('show2FASetup') === 'true');

  // Persist 2FA setup state so tab-switching doesn't close the dialog
  const toggle2FASetup = (value: boolean) => {
    setShow2FASetup(value);
    if (value) {
      sessionStorage.setItem('show2FASetup', 'true');
    } else {
      sessionStorage.removeItem('show2FASetup');
    }
  };

  // Sync profile state when profile loads
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleProfileSave = async () => {
    if (!fullName.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setProfileSaving(true);
    const { error } = await updateProfile({
      full_name: fullName.trim(),
      company_name: companyName.trim() || null,
    });
    setProfileSaving(false);
    if (error) {
      toast({ title: 'Failed to update profile', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated' });
    }
  };

  const handleEmailChange = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }
    if (trimmed === user?.email) {
      toast({ title: 'This is already your current email', variant: 'destructive' });
      return;
    }
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setEmailSaving(false);
    if (error) {
      toast({ title: 'Failed to update email', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Confirmation sent', description: 'Check both your current and new email inboxes to confirm the change.' });
      setNewEmail('');
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setPasswordSaving(true);

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: currentPassword,
    });

    if (signInError) {
      setPasswordSaving(false);
      toast({ title: 'Current password is incorrect', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);

    if (error) {
      toast({ title: 'Failed to update password', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleDeleteAccount = async () => {
    toast({ title: 'Account deletion requested', description: 'Please contact support to complete account deletion.' });
  };

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <PageHeader title="Account Settings" />
          <p className="text-sm text-muted-foreground -mt-4">Manage your profile, password, and account preferences.</p>

          {/* Profile Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">Profile</CardTitle>
                  <CardDescription>Update your personal information and avatar.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <UserAvatarUpload
                  userId={user?.id || ''}
                  avatarUrl={profile?.avatar_url}
                  initials={initials}
                  onAvatarUpdate={updateAvatarUrl}
                  size="md"
                />
                <div>
                  <p className="font-medium">{displayName}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Your company (optional)"
                  />
                </div>
              </div>

              <Button onClick={handleProfileSave} disabled={profileSaving}>
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>

          {/* Email Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">Email Address</CardTitle>
                  <CardDescription>Your email is used for signing in and notifications.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label htmlFor="newEmail">New Email Address</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A confirmation link will be sent to both your current and new email addresses.
              </p>
              <Button onClick={handleEmailChange} disabled={emailSaving || !newEmail.trim()}>
                {emailSaving ? 'Sending...' : 'Change Email'}
              </Button>
            </CardContent>
          </Card>


          {/* Two-Factor Authentication Section */}
          <Card className={!profile?.two_factor_enabled ? 'border-amber-300/50' : ''}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Required for HIPAA compliance. Adds an extra layer of security by sending a verification code to your email on each login.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {show2FASetup && user ? (
                <TwoFactorVerification
                  userId={user.id}
                  email={user.email || ''}
                  isSetup
                  onVerified={() => {
                    toggle2FASetup(false);
                    window.location.reload();
                  }}
                  onCancel={() => toggle2FASetup(false)}
                />
              ) : profile?.two_factor_enabled ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 border border-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">2FA is enabled</p>
                    <p className="text-xs text-muted-foreground">A verification code is sent to your email each time you sign in.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      HIPAA requires two-factor authentication to safeguard protected health information (PHI). Enable 2FA to ensure your account is compliant.
                    </p>
                  </div>
                  <Button onClick={() => toggle2FASetup(true)} className="gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Enable Two-Factor Authentication
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Password Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button onClick={handlePasswordChange} disabled={passwordSaving || !currentPassword || !newPassword}>
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>

          {/* Delete Account Section */}
          <Card className="border-destructive/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <div>
                  <CardTitle className="text-lg text-destructive">Delete Account</CardTitle>
                  <CardDescription>Permanently delete your account and all associated data. This action cannot be undone.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete My Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account, properties, conversations, and all associated data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="deleteConfirm">Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
                    <Input
                      id="deleteConfirm"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleteConfirmText !== 'DELETE'}
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Data Export
              </CardTitle>
              <CardDescription>Download a full SQL backup of all your data</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) { toast({ title: 'Please log in first', variant: 'destructive' }); return; }
                    toast({ title: 'Generating backup...', description: 'This may take a moment for large datasets.' });
                    const resp = await supabase.functions.invoke('export-data-backup', {});
                    if (resp.error) throw resp.error;
                    const blob = new Blob([resp.data], { type: 'application/sql' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `data-backup-${new Date().toISOString().slice(0, 10)}.sql`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                    toast({ title: 'Backup downloaded!' });
                  } catch (err: any) {
                    toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download SQL Data Backup
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AccountSettings;
