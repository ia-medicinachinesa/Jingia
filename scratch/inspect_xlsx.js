const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function inspectExcel(filePath) {
  console.log(`\n=== Inspecting: ${filePath} ===`);
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist.');
    return;
  }
  
  const workbook = xlsx.readFile(filePath);
  console.log(`Sheet Names:`, workbook.SheetNames);
  
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log(`Sheet "${sheetName}" has ${data.length} rows.`);
    if (data.length > 0) {
      console.log('Columns/Headers:', Object.keys(data[0]));
      console.log('Sample Row:', data[0]);
    }
  });
}

inspectExcel(path.join(__dirname, '..', '0d9cda77-8c85-5860-a522-018ea0df1132.xlsx'));
inspectExcel(path.join(__dirname, '..', 'Usuários', 'a9f9b25f-1518-50e1-89ce-3e69d2a3ab55.xlsx'));
