const fs = require('fs');
const path = require('path');

function parseSqlValues(content) {
  const valuesPartMatch = content.match(/VALUES\s*([\s\S]+)$/i);
  if (!valuesPartMatch) return [];
  let valuesStr = valuesPartMatch[1].trim();
  if (valuesStr.endsWith(';')) {
    valuesStr = valuesStr.slice(0, -1);
  }
  
  const tuples = [];
  let inString = false;
  let currentTuple = '';
  let parenLevel = 0;
  
  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    if (char === "'" && valuesStr[i - 1] !== '\\') {
      inString = !inString;
      currentTuple += char;
    } else if (!inString) {
      if (char === '(') {
        parenLevel++;
        if (parenLevel === 1) {
          currentTuple = '';
          continue;
        }
      } else if (char === ')') {
        parenLevel--;
        if (parenLevel === 0) {
          tuples.push(currentTuple);
          currentTuple = '';
          continue;
        }
      }
      currentTuple += char;
    } else {
      currentTuple += char;
    }
  }
  
  return tuples.map(t => {
    const values = [];
    let currentVal = '';
    let inStr = false;
    for (let i = 0; i < t.length; i++) {
      const char = t[i];
      if (char === "'" && t[i - 1] !== '\\') {
        inStr = !inStr;
      } else if (char === ',' && !inStr) {
        values.push(cleanVal(currentVal));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(cleanVal(currentVal));
    return values;
  });
}

function cleanVal(val) {
  val = val.trim();
  if (val === 'null' || val === 'NULL' || val === '') return null;
  if (!isNaN(val)) return Number(val);
  return val;
}

try {
  const usersSql = fs.readFileSync(path.join('Usuários', 'users_rows (1).sql'), 'utf8');
  const parsedUsers = parseSqlValues(usersSql);
  console.log(`Successfully parsed ${parsedUsers.length} users.`);
  console.log(`Sample user:`, parsedUsers[0]);

  const threadsSql = fs.readFileSync(path.join('Usuários', 'threads_rows.sql'), 'utf8');
  const parsedThreads = parseSqlValues(threadsSql);
  console.log(`Successfully parsed ${parsedThreads.length} threads.`);
  console.log(`Sample thread:`, parsedThreads[0]);
} catch (err) {
  console.error(err);
}
