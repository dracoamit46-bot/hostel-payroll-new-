import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function test() {
  const { data: users } = await supabase.from('users').select('id, name, role').neq('role', 'owner').limit(3);
  
  if (users && users.length > 0) {
    const id = users[0].id;
    console.log('Attempting to hard delete:', id);
    
    // Attempt raw delete to see the exact foreign key error
    const { error: rawErr } = await supabase.from('users').delete().eq('id', id);
    console.log('Raw Delete error:', rawErr);
    
    if (rawErr) {
      console.log('Need cascading delete...');
      
      // Cleanup script:
      await supabase.from('attendance_records').update({ marked_by: null }).eq('marked_by', id);
      await supabase.from('leave_requests').update({ reviewed_by: null }).eq('reviewed_by', id);
      await supabase.from('week_off_requests').update({ reviewed_by: null }).eq('reviewed_by', id);
      await supabase.from('attendance_correction_requests').update({ reviewed_by: null }).eq('reviewed_by', id);
      await supabase.from('tasks').update({ last_action_by: null }).eq('last_action_by', id);
      await supabase.from('tasks').update({ assigned_to: null }).eq('assigned_to', id);
      await supabase.from('vouchers').update({ approved_by: null }).eq('approved_by', id);
      await supabase.from('salary_advances').update({ created_by: null }).eq('created_by', id);
      await supabase.from('salary_history').update({ created_by: null }).eq('created_by', id);
      await supabase.from('payroll_adjustments').update({ created_by: null }).eq('created_by', id);
      await supabase.from('payroll_records').update({ generated_by: null }).eq('generated_by', id);
      await supabase.from('payroll_records').update({ approved_by: null }).eq('approved_by', id);
      await supabase.from('payroll_records').update({ locked_by: null }).eq('locked_by', id);
      await supabase.from('payroll_records').update({ paid_by: null }).eq('paid_by', id);

      const { data: userTasks } = await supabase.from('tasks').select('id').eq('created_by', id);
      if (userTasks && userTasks.length > 0) {
        const taskIds = userTasks.map((t) => t.id);
        await supabase.from('task_comments').delete().in('task_id', taskIds);
        await supabase.from('vouchers').delete().in('task_id', taskIds);
        await supabase.from('tasks').delete().in('id', taskIds);
      }

      const { data: userPayrolls } = await supabase.from('payroll_records').select('id').eq('user_id', id);
      if (userPayrolls && userPayrolls.length > 0) {
        const pIds = userPayrolls.map((p) => p.id);
        await supabase.from('payroll_adjustments').delete().in('payroll_record_id', pIds);
      }

      await supabase.from('payroll_adjustments').delete().eq('created_by', id);
      await supabase.from('payroll_records').delete().eq('user_id', id);
      await supabase.from('salary_advances').delete().eq('user_id', id);
      await supabase.from('salary_history').delete().eq('user_id', id);
      await supabase.from('task_comments').delete().eq('user_id', id);
      await supabase.from('vouchers').delete().eq('created_by', id);
      await supabase.from('attendance_records').delete().eq('user_id', id);
      await supabase.from('leave_requests').delete().eq('user_id', id);
      await supabase.from('week_off_requests').delete().eq('user_id', id);
      await supabase.from('attendance_correction_requests').delete().eq('user_id', id);
      await supabase.from('shifts').delete().eq('user_id', id);
      await supabase.from('staff_performance').delete().eq('user_id', id);
      await supabase.from('leaves').delete().eq('user_id', id);
      await supabase.from('geofence_logs').delete().eq('user_id', id);
      await supabase.from('notifications').delete().eq('user_id', id);
      await supabase.from('inventory_logs').delete().eq('created_by', id);
      
      const { error: cascadeErr } = await supabase.from('users').delete().eq('id', id);
      console.log('Cascade Delete error:', cascadeErr);
      
      const { data: check } = await supabase.from('users').select('*').eq('id', id);
      console.log('Still exists after cascade?', check);
    } else {
      const { data: check } = await supabase.from('users').select('*').eq('id', id);
      console.log('Still exists after raw delete?', check);
    }
  }
}

test();
