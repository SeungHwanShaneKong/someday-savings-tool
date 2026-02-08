import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface InvitationRequest {
  email: string;
  budgetId: string;
  budgetName: string;
  role: 'editor' | 'viewer';
  inviterName: string;
}

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invitation function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Extract the JWT token from Authorization header
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the user using admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error("User authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, budgetId, budgetName, role, inviterName }: InvitationRequest = await req.json();
    console.log("Invitation request:", { email, budgetId, role, inviterName });

    // Validate required fields
    if (!email || !budgetId || !role) {
      console.error("Missing required fields:", { email: !!email, budgetId: !!budgetId, role: !!role });
      return new Response(
        JSON.stringify({ error: "필수 정보가 누락되었어요" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "올바른 이메일 형식이 아니에요" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user owns this budget using admin client
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('budgets')
      .select('id, user_id, name')
      .eq('id', budgetId)
      .eq('user_id', user.id)
      .single();

    if (budgetError || !budget) {
      console.error("Budget not found or access denied:", budgetError);
      return new Response(
        JSON.stringify({ error: "예산을 찾을 수 없거나 접근 권한이 없어요" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabaseAdmin
      .from('budget_invitations')
      .select('id')
      .eq('budget_id', budgetId)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: "이미 이 이메일로 초대장을 보냈어요" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check by email if the user exists
    const { data: targetUser } = await supabaseAdmin.auth.admin.listUsers();
    const invitedUser = targetUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (invitedUser) {
      const { data: isCollaborator } = await supabaseAdmin
        .from('budget_collaborators')
        .select('id')
        .eq('budget_id', budgetId)
        .eq('user_id', invitedUser.id)
        .maybeSingle();

      if (isCollaborator) {
        return new Response(
          JSON.stringify({ error: "이 사용자는 이미 협업자예요" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('budget_invitations')
      .insert({
        budget_id: budgetId,
        email: email.toLowerCase(),
        role: role,
        invited_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (invitationError) {
      console.error("Failed to create invitation:", invitationError);
      return new Response(
        JSON.stringify({ error: "초대장 생성에 실패했어요" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Invitation created:", invitation);

    // Create in-app notification if user exists
    if (invitedUser) {
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: invitedUser.id,
          type: 'invitation',
          title: '예산 공유 초대',
          message: `${inviterName}님이 "${budgetName}" 예산을 공유했어요`,
          data: {
            invitation_id: invitation.id,
            budget_id: budgetId,
            budget_name: budgetName,
            role: role,
            token: invitation.token,
          }
        });
      console.log("In-app notification created for existing user");
    }

    // Send invitation email
    const inviteUrl = `https://wedsem.org/budget?invite=${invitation.token}`;
    
    const roleText = role === 'editor' ? '편집자' : '조회자';
    
    try {
      const emailResponse = await resend.emails.send({
        from: "웨딩셈 <noreply@wedsem.org>",
        to: [email],
        subject: `[웨딩셈] ${inviterName}님이 결혼 예산을 공유했어요`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <div style="text-align: center; margin-bottom: 32px;">
                <span style="font-size: 48px;">💒</span>
                <h1 style="color: #1f2937; font-size: 24px; margin: 16px 0 8px;">예산 공유 초대</h1>
              </div>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                안녕하세요!<br><br>
                <strong style="color: #1f2937;">${inviterName}</strong>님이 결혼 예산 "<strong style="color: #1f2937;">${budgetName}</strong>"을(를) 공유했어요.
              </p>
              
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  부여된 권한: <strong style="color: #1f2937;">${roleText}</strong>
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0;">
                  ${role === 'editor' ? '예산 항목을 추가, 수정, 삭제할 수 있어요.' : '예산을 조회만 할 수 있어요.'}
                </p>
              </div>
              
              <a href="${inviteUrl}" style="display: block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; text-align: center; font-size: 16px;">
                초대 수락하기
              </a>
              
              <p style="color: #9ca3af; font-size: 12px; margin-top: 32px; text-align: center;">
                이 초대는 7일 후 만료됩니다.<br>
                초대를 요청하지 않았다면 이 이메일을 무시해주세요.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      console.log("Resend API response:", JSON.stringify(emailResponse));
      
      // Check if email was actually sent (Resend returns data.id on success)
      if (emailResponse.data?.id) {
        console.log("Email sent successfully with ID:", emailResponse.data.id);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            invitation_id: invitation.id,
            email_sent: true,
            message: "초대장을 보냈어요"
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (emailResponse.error) {
        console.error("Resend API error:", emailResponse.error);
        
        // Rollback: Delete the invitation if email failed
        console.log("Rolling back invitation due to email failure...");
        await supabaseAdmin
          .from('budget_invitations')
          .delete()
          .eq('id', invitation.id);
        
        // Also delete the notification if it was created
        if (invitedUser) {
          await supabaseAdmin
            .from('notifications')
            .delete()
            .eq('user_id', invitedUser.id);
        }
        
        // Return error to user with helpful message
        let userFacingError = "이메일 발송에 실패했어요. 잠시 후 다시 시도해주세요.";
        if (emailResponse.error.message?.includes("verify a domain")) {
          userFacingError = "이메일 서비스 설정이 필요해요. 관리자에게 문의해주세요. (Resend 도메인 검증 필요)";
        }
        
        return new Response(
          JSON.stringify({ 
            error: userFacingError,
            details: emailResponse.error.message 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Fallback: if no data.id and no error, still return success with in-app notification
      return new Response(
        JSON.stringify({ 
          success: true, 
          invitation_id: invitation.id,
          email_sent: false,
          message: invitedUser ? "앱 내 알림으로 초대를 보냈어요" : "초대장을 생성했어요"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (emailCatchError: any) {
      console.error("Failed to send email (exception):", emailCatchError);
      
      // Rollback: Delete the invitation
      console.log("Rolling back invitation due to email exception...");
      await supabaseAdmin
        .from('budget_invitations')
        .delete()
        .eq('id', invitation.id);
      
      return new Response(
        JSON.stringify({ 
          error: "이메일 발송 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.",
          details: emailCatchError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
