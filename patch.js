const fs = require('fs');
let code = fs.readFileSync('src/services/dataService.ts', 'utf8');

const target = `      // 3. Delete the user row from public.users (Hard Delete)
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) {
        throw new Error(error.message || 'Failed to hard delete user from database');
      }`;

const replacement = `      // 3. Soft Delete the user row from public.users (Physical Hard Delete blocked by RLS)
      const deletedPhone = userCheck?.phone ? \`\${userCheck.phone}_deleted_\${Date.now()}\` : \`deleted_\${Date.now()}\`;
      const { error } = await supabase.from('users').update({ is_active: false, phone: deletedPhone }).eq('id', id);
      if (error) {
        throw new Error(error.message || 'Failed to soft delete user from database');
      }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/services/dataService.ts', code);
