const fs = require('fs');
const path = require('path');

const sqlPath = path.join('c:', 'Users', 'gusta', 'Downloads', 'jingia', 'Usuários', 'users_rows.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

const valuesRegex = /\(([^)]+)\)/g;
let match;
const dbUsers = [];
while ((match = valuesRegex.exec(sqlContent)) !== null) {
  if (match[1].includes("'")) { 
    // split correctly handling single quotes is tricky with simple split, 
    // but looking at the SQL structure:
    // "id", "clerk_user_id", "email", "subscription_status", "subscription_expires_at", "plan_id", "trial_messages_used", "monthly_message_count", "message_count_reset_at", "created_at", "updated_at", "crm", "specialty"
    // Let's do a simple eval-like array parse since it's just a values tuple
    const tupleStr = `[${match[1]}]`;
    try {
      // replacing SQL null with JS null
      const parsedTuple = eval(tupleStr.replace(/\bnull\b/g, 'null'));
      dbUsers.push({
        id: parsedTuple[0],
        email: parsedTuple[2],
        status: parsedTuple[3],
        subscription_expires_at: parsedTuple[4],
        plan_id: parsedTuple[5],
        monthly_message_count: parsedTuple[7],
        message_count_reset_at: parsedTuple[8]
      });
    } catch (e) {}
  }
}

const activeUsers = dbUsers.filter(u => u.status === 'active');

const nullExpires = activeUsers.filter(u => u.subscription_expires_at === null);
const nullReset = activeUsers.filter(u => u.message_count_reset_at === null);

console.log('--- RELATÓRIO DE DATAS FALTANTES EM USUÁRIOS ATIVOS ---');
console.log(`\nUsuários SEM data de expiração da assinatura (${nullExpires.length}):`);
nullExpires.forEach(u => console.log(`- ${u.email} (Plano: ${u.plan_id})`));

console.log(`\nUsuários SEM data de reset de mensagens (${nullReset.length}):`);
nullReset.forEach(u => console.log(`- ${u.email} (Plano: ${u.plan_id}, Mensagens Usadas: ${u.monthly_message_count})`));
