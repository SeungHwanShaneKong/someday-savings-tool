import { useState } from 'react';
import { useCollaboration, CollaboratorRole } from '@/hooks/useCollaboration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Crown, 
  Pencil, 
  Eye,
  X,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollaborationPanelProps {
  budgetId: string | null;
  ownerEmail?: string;
  ownerName?: string;
  trigger?: React.ReactNode;
}

const ROLE_CONFIG: Record<CollaboratorRole, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: '소유자', icon: Crown, color: 'text-yellow-500' },
  editor: { label: '편집자', icon: Pencil, color: 'text-blue-500' },
  viewer: { label: '조회자', icon: Eye, color: 'text-gray-500' },
};

export function CollaborationPanel({ 
  budgetId, 
  ownerEmail,
  ownerName,
  trigger 
}: CollaborationPanelProps) {
  const {
    collaborators,
    invitations,
    myRole,
    canManageCollaborators,
    loading,
    sendInvitation,
    cancelInvitation,
    updateCollaboratorRole,
    removeCollaborator,
  } = useCollaboration(budgetId);

  const [isOpen, setIsOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('editor');
  const [isSending, setIsSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInviteEmail(value);
    
    // Clear error when user starts typing
    if (emailError) {
      setEmailError(null);
    }
  };

  const handleSendInvitation = async () => {
    const trimmedEmail = inviteEmail.trim();
    
    if (!trimmedEmail) {
      setEmailError('이메일 주소를 입력해주세요');
      return;
    }
    
    if (!validateEmail(trimmedEmail)) {
      setEmailError('올바른 이메일 형식이 아니에요 (예: example@gmail.com)');
      return;
    }
    
    setEmailError(null);
    setIsSending(true);
    const result = await sendInvitation(trimmedEmail, inviteRole);
    setIsSending(false);
    
    if (result.success) {
      setInviteEmail('');
      setInviteRole('editor');
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">공유</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            예산 공유 관리
          </SheetTitle>
          <SheetDescription>
            다른 사람을 초대하여 함께 예산을 관리하세요.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Invite Section - Only for owners */}
          {canManageCollaborators && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                새 협업자 초대
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">이메일 주소</Label>
                  <div className="flex flex-col gap-1">
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="example@gmail.com"
                      value={inviteEmail}
                      onChange={handleEmailChange}
                      className={cn("flex-1", emailError && "border-destructive focus-visible:ring-destructive")}
                      disabled={isSending}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSending) {
                          e.preventDefault();
                          handleSendInvitation();
                        }
                      }}
                    />
                    {emailError && (
                      <p className="text-xs text-destructive">{emailError}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>권한</Label>
                  <Select 
                    value={inviteRole} 
                    onValueChange={(v) => setInviteRole(v as CollaboratorRole)}
                    disabled={isSending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Pencil className="h-4 w-4 text-blue-500" />
                          <span>편집자</span>
                          <span className="text-xs text-muted-foreground">- 수정 가능</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-gray-500" />
                          <span>조회자</span>
                          <span className="text-xs text-muted-foreground">- 읽기만</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleSendInvitation} 
                  className="w-full"
                  disabled={!inviteEmail.trim() || isSending}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      초대장 보내는 중...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      초대장 보내기
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                대기 중인 초대
              </h3>
              
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div 
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-yellow-100 text-yellow-700">
                          {getInitials(undefined, invitation.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{invitation.email}</p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-xs">
                            {ROLE_CONFIG[invitation.role].label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">대기 중</span>
                        </div>
                      </div>
                    </div>
                    
                    {canManageCollaborators && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => cancelInvitation(invitation.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Collaborators */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              현재 협업자
            </h3>
            
            <div className="space-y-2">
              {/* Owner */}
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-yellow-100 text-yellow-700">
                      {getInitials(ownerName, ownerEmail)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{ownerName || ownerEmail || '소유자'}</p>
                    <div className="flex items-center gap-1.5">
                      <Crown className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-yellow-600 font-medium">소유자</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collaborators */}
              {collaborators.map((collaborator) => {
                const roleConfig = ROLE_CONFIG[collaborator.role];
                const RoleIcon = roleConfig.icon;
                
                return (
                  <div 
                    key={collaborator.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(collaborator.display_name, collaborator.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {collaborator.display_name || collaborator.email || '협업자'}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <RoleIcon className={cn("h-3 w-3", roleConfig.color)} />
                          <span className="text-xs text-muted-foreground">
                            {roleConfig.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {canManageCollaborators && (
                      <div className="flex items-center gap-1">
                        <Select
                          value={collaborator.role}
                          onValueChange={(v) => updateCollaboratorRole(collaborator.id, v as CollaboratorRole)}
                        >
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">편집자</SelectItem>
                            <SelectItem value="viewer">조회자</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>협업자 제거</AlertDialogTitle>
                              <AlertDialogDescription>
                                이 사용자를 협업자 목록에서 제거하시겠어요?
                                더 이상 이 예산에 접근할 수 없게 됩니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => removeCollaborator(collaborator.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                제거
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                );
              })}

              {collaborators.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  아직 초대된 협업자가 없어요
                </p>
              )}
            </div>
          </div>

          {/* Current User's Role */}
          {myRole && !canManageCollaborators && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                나의 권한: <strong>{ROLE_CONFIG[myRole].label}</strong>
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}