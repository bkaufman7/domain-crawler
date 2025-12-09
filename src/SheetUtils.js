/**
 * SheetUtils.js
 * Helper utilities for Google Sheets operations.
 * Provides efficient batch operations and common sheet manipulation functions.
 * 
 * @author Brian Kaufman - Horizon Media
 * @version 1.0.0
 */

/**
 * Ensures a sheet exists with the given name and headers
 * Creates the sheet if it doesn't exist, or adds/updates headers if it does
 * 
 * @param {string} sheetName - Name of the sheet
 * @param {Array<string>} headers - Array of column header names
 * @returns {string} 'created', 'updated', or 'unchanged'
 */
function ensureSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    // Create new sheet
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format header row
    formatHeaderRow(sheet, headers.length);
    
    Logger.log(`Created new sheet: ${sheetName}`);
    return 'created';
  }
  
  // Sheet exists - check if headers need updating
  const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headersMatch = arraysEqual(existingHeaders, headers);
  
  if (!headersMatch) {
    // Update headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, headers.length);
    Logger.log(`Updated headers for sheet: ${sheetName}`);
    return 'updated';
  }
  
  return 'unchanged';
}

/**
 * Formats the header row with standard styling
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {number} numColumns - Number of columns to format
 */
function formatHeaderRow(sheet, numColumns) {
  const headerRange = sheet.getRange(1, 1, 1, numColumns);
  
  headerRange
    .setFontWeight('bold')
    .setBackground('#4285F4')
    .setFontColor('#FFFFFF')
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Auto-resize columns
  for (let i = 1; i <= numColumns; i++) {
    sheet.autoResizeColumn(i);
  }
}

/**
 * Finds the column index (0-based) for a given header name
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {string} headerName - Name of the header to find
 * @returns {number} Column index (0-based), or -1 if not found
 */
function findHeaderIndex(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(headerName);
}

/**
 * Finds the column letter (A, B, C, etc.) for a given header name
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {string} headerName - Name of the header to find
 * @returns {string} Column letter, or empty string if not found
 */
function findHeaderColumn(sheet, headerName) {
  const index = findHeaderIndex(sheet, headerName);
  if (index === -1) return '';
  return columnToLetter(index + 1);
}

/**
 * Converts a column number to letter (1=A, 2=B, 27=AA, etc.)
 * 
 * @param {number} column - Column number (1-based)
 * @returns {string} Column letter
 */
function columnToLetter(column) {
  let temp;
  let letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

/**
 * Appends rows to a sheet efficiently using batch operations
 * 
 * @param {string} sheetName - Name of the sheet
 * @param {Array<Array>} rows - Array of row arrays to append
 */
function appendRows(sheetName, rows) {
  if (!rows || rows.length === 0) return;
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  
  const lastRow = sheet.getLastRow();
  const numCols = rows[0].length;
  
  sheet.getRange(lastRow + 1, 1, rows.length, numCols).setValues(rows);
  Logger.log(`Appended ${rows.length} row(s) to ${sheetName}`);
}

/**
 * Updates or inserts a row based on a key column
 * If a row with the key value exists, updates it; otherwise appends new row
 * 
 * @param {string} sheetName - Name of the sheet
 * @param {string} keyHeader - Header name of the key column
 * @param {*} keyValue - Value to search for
 * @param {Object} rowData - Object with header names as keys and values to set
 * @returns {string} 'updated' or 'inserted'
 */
function upsertRow(sheetName, keyHeader, keyValue, rowData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyColIndex = headers.indexOf(keyHeader);
  
  if (keyColIndex === -1) {
    throw new Error(`Header not found: ${keyHeader} in sheet ${sheetName}`);
  }
  
  // Get all data
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Find existing row
  for (let i = 1; i < values.length; i++) {
    if (values[i][keyColIndex] === keyValue) {
      // Update existing row
      updateRowByIndex(sheet, i + 1, headers, rowData);
      return 'updated';
    }
  }
  
  // Insert new row
  const newRow = buildRowFromObject(headers, rowData);
  sheet.appendRow(newRow);
  return 'inserted';
}

/**
 * Updates a specific row by index with values from an object
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {number} rowIndex - Row index (1-based)
 * @param {Array<string>} headers - Array of header names
 * @param {Object} rowData - Object with header names as keys
 */
function updateRowByIndex(sheet, rowIndex, headers, rowData) {
  headers.forEach((header, colIndex) => {
    if (rowData.hasOwnProperty(header)) {
      sheet.getRange(rowIndex, colIndex + 1).setValue(rowData[header]);
    }
  });
}

/**
 * Builds a row array from an object based on header order
 * 
 * @param {Array<string>} headers - Array of header names
 * @param {Object} rowData - Object with header names as keys
 * @returns {Array} Row array matching header order
 */
function buildRowFromObject(headers, rowData) {
  return headers.map(header => rowData[header] || '');
}

/**
 * Clears all data from a sheet except the header row
 * 
 * @param {string} sheetName - Name of the sheet to clear
 */
function clearSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`Sheet not found (skipping clear): ${sheetName}`);
    return;
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
    Logger.log(`Cleared ${lastRow - 1} row(s) from ${sheetName}`);
  }
}

/**
 * Gets all data from a sheet as an array of objects
 * Each object has header names as keys
 * 
 * @param {string} sheetName - Name of the sheet
 * @returns {Array<Object>} Array of row objects
 */
function getSheetDataAsObjects(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const objects = [];
  
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = data[i][index];
    });
    objects.push(obj);
  }
  
  return objects;
}

/**
 * Gets rows from a sheet that match a filter condition
 * 
 * @param {string} sheetName - Name of the sheet
 * @param {string} columnHeader - Header name to filter on
 * @param {*} value - Value to match
 * @returns {Array<Object>} Array of matching row objects
 */
function getRowsWhere(sheetName, columnHeader, value) {
  const allRows = getSheetDataAsObjects(sheetName);
  return allRows.filter(row => row[columnHeader] === value);
}

/**
 * Counts rows matching a condition
 * 
 * @param {string} sheetName - Name of the sheet
 * @param {string} columnHeader - Header name to filter on
 * @param {*} value - Value to match
 * @returns {number} Count of matching rows
 */
function countRowsWhere(sheetName, columnHeader, value) {
  return getRowsWhere(sheetName, columnHeader, value).length;
}

/**
 * Compares two arrays for equality
 * 
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {boolean} True if arrays are equal
 */
function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  
  return true;
}

/**
 * Sorts a sheet by a specific column
 * 
 * @param {string} sheetName - Name of the sheet
 * @param {string} columnHeader - Header name to sort by
 * @param {boolean} ascending - True for ascending, false for descending
 */
function sortSheetByColumn(sheetName, columnHeader, ascending = true) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return;
  
  const colIndex = findHeaderIndex(sheet, columnHeader);
  if (colIndex === -1) {
    throw new Error(`Column not found: ${columnHeader}`);
  }
  
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  range.sort({ column: colIndex + 1, ascending: ascending });
  
  Logger.log(`Sorted ${sheetName} by ${columnHeader} (${ascending ? 'asc' : 'desc'})`);
}

/**
 * Applies alternating row colors for better readability
 * 
 * @param {string} sheetName - Name of the sheet
 */
function applyAlternatingRowColors(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return;
  
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  
  // Create banding
  range.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  
  Logger.log(`Applied alternating row colors to ${sheetName}`);
}

/**
 * Removes duplicate rows based on a key column
 * 
 * @param {string} sheetName - Name of the sheet
 * @param {string} keyHeader - Header name of the key column
 * @returns {number} Number of duplicates removed
 */
function removeDuplicates(sheetName, keyHeader) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return 0;
  
  const keyColIndex = findHeaderIndex(sheet, keyHeader);
  if (keyColIndex === -1) {
    throw new Error(`Column not found: ${keyHeader}`);
  }
  
  const data = sheet.getDataRange().getValues();
  const seen = new Set();
  const rowsToDelete = [];
  
  // Start from bottom to avoid index shifting issues
  for (let i = data.length - 1; i > 0; i--) {
    const keyValue = data[i][keyColIndex];
    
    if (seen.has(keyValue)) {
      rowsToDelete.push(i + 1); // 1-based index
    } else {
      seen.add(keyValue);
    }
  }
  
  // Delete duplicate rows
  rowsToDelete.forEach(rowIndex => {
    sheet.deleteRow(rowIndex);
  });
  
  if (rowsToDelete.length > 0) {
    Logger.log(`Removed ${rowsToDelete.length} duplicate row(s) from ${sheetName}`);
  }
  
  return rowsToDelete.length;
}

/**
 * Gets unique values from a column
 * 
 * @param {string} sheetName - Name of the sheet
 * @param {string} columnHeader - Header name
 * @returns {Array} Array of unique values (excluding empty)
 */
function getUniqueValues(sheetName, columnHeader) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  const colIndex = findHeaderIndex(sheet, columnHeader);
  if (colIndex === -1) return [];
  
  const data = sheet.getDataRange().getValues();
  const values = new Set();
  
  for (let i = 1; i < data.length; i++) {
    const value = data[i][colIndex];
    if (value !== '' && value !== null && value !== undefined) {
      values.add(value);
    }
  }
  
  return Array.from(values).sort();
}

/**
 * Creates a simple progress bar string
 * 
 * @param {number} current - Current value
 * @param {number} total - Total value
 * @param {number} width - Width of progress bar in characters
 * @returns {string} Progress bar string
 */
function createProgressBar(current, total, width = 20) {
  const percent = total > 0 ? (current / total) : 0;
  const filled = Math.round(percent * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percentText = (percent * 100).toFixed(1) + '%';
  
  return `[${bar}] ${percentText} (${current}/${total})`;
}
