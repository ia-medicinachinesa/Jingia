const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const sqlPath = path.join('c:', 'Users', 'gusta', 'Downloads', 'jingia', 'Usuários', 'users_rows.sql');
const xlsxPath = path.join('c:', 'Users', 'gusta', 'Downloads', 'jingia', 'Usuários', '3c8c39c9-7efa-5fe4-9a54-56b97bd24101.xlsx');

// 1. Read SQL
const sqlContent = fs.readFileSync(sqlPath, 'utf8');
const valuesRegex = /\(([^)]+)\)/g;
let match;
const dbUsers = [];
while ((match = valuesRegex.exec(sqlContent)) !== null) {
  if (match[1].includes("'")) { // basic filter
    const cols = match[1].split(',').map(s => s.trim().replace(/'/g, ''));
    if (cols.length >= 6) {
      dbUsers.push({
        id: cols[0],
        email: cols[2],
        status: cols[3],
        plan_id: cols[5] === 'null' ? null : cols[5]
      });
    }
  }
}

console.log(`[Supabase] Found ${dbUsers.length} users in SQL.`);
const dbUsersWithNullPlan = dbUsers.filter(u => u.status === 'active' && u.plan_id === null);
console.log(`[Supabase] Active users with NULL plan:`, dbUsersWithNullPlan.map(u => u.email));

// 2. Read XLSX
const workbook = xlsx.readFile(xlsxPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const hublaUsers = xlsx.utils.sheet_to_json(sheet);

console.log(`\n[Hubla] Found ${hublaUsers.length} rows in XLSX.`);
const hublaEmails = hublaUsers.map(u => u['Email'] || u['email'] || u['E-mail']).filter(Boolean);

console.log(`\n--- DISCREPANCIES ---`);
const dbEmails = dbUsers.map(u => u.email);

const inHublaNotInDb = hublaUsers.filter(u => {
  const email = u['Email'] || u['email'] || u['E-mail'];
  return email && !dbEmails.includes(email.toLowerCase());
});

console.log(`In Hubla but not in DB (${inHublaNotInDb.length}):`, inHublaNotInDb.map(u => u['Email'] || u['email'] || u['E-mail']));

// Also check what products the NULL plan users bought
for (const email of dbUsersWithNullPlan.map(u => u.email)) {
  const hublaRecord = hublaUsers.find(u => {
    const e = u['Email'] || u['email'] || u['E-mail'];
    return e && e.toLowerCase() === email;
  });
  if (hublaRecord) {
    console.log(`User ${email} bought product: ${hublaRecord['Produto'] || hublaRecord['Product'] || hublaRecord['Offer'] || 'Unknown'}`);
  } else {
    console.log(`User ${email} not found in Hubla export!`);
  }
}
