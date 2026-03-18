
/*
 * MAGIC STORYBOOK BACKEND
 * 
 * 1. Deploy this script as a Web App.
 * 2. Execute as: "Me"
 * 3. Who has access: "Anyone"
 * 4. Paste the URL into the Magic Storybook app.
 */

const FOLDER_NAME = "Magic Storybook Library";
const SPREADSHEET_NAME = "Magic Storybook Index";
const PROGRESS_SPREADSHEET_NAME = "Magic Storybook Progress Index";

function doPost(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 10 seconds for other processes to finish.
  if (!lock.tryLock(10000)) {
    return responseJSON({ error: "Server is busy. Please try again." });
  }

  try {
    // e.postData.contents is available even with text/plain
    // Handle potential empty body if strictly testing
    if (!e.postData || !e.postData.contents) {
        return responseJSON({ error: "No data" });
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'save') {
      const story = data.story;
      const result = saveStory(story);
      return responseJSON({ success: true, story: result });
    } 
    else if (action === 'delete') {
      deleteStory(data.id);
      return responseJSON({ success: true });
    } 
    else if (action === 'saveProgress') {
      const progress = data.progress;
      saveProgress(progress);
      return responseJSON({ success: true });
    }
    else if (action === 'ping') {
      return responseJSON({ success: true, message: "Pong" });
    }
    
    return responseJSON({ error: "Unknown action" });
  } catch (err) {
    return responseJSON({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  // Allow ping via GET for easier connectivity testing
  if (e.parameter && e.parameter.action === 'ping') {
    return responseJSON({ success: true, message: "Pong" });
  }

  if (e.parameter && e.parameter.action === 'getProgress') {
    try {
      const progress = getAllProgress();
      return responseJSON({ success: true, progress });
    } catch (err) {
      return responseJSON({ error: err.toString() });
    }
  }

  // Returns list of stories
  try {
    const stories = getAllStories();
    return responseJSON({ success: true, stories: stories });
  } catch (err) {
    return responseJSON({ error: err.toString() });
  }
}

// --- Helpers ---

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrSetupResources() {
  // 1. Get/Create Folder
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  let folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(FOLDER_NAME);
  }

  // 2. Get/Create Spreadsheet
  const files = folder.getFilesByName(SPREADSHEET_NAME);
  let sheet;
  if (files.hasNext()) {
    const file = files.next();
    sheet = SpreadsheetApp.openById(file.getId()).getActiveSheet();
  } else {
    const ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    const file = DriveApp.getFileById(ss.getId());
    file.moveTo(folder); // Move sheet into the folder
    sheet = ss.getActiveSheet();
    // Setup headers: ID, Title, CreatedAt, FileID
    sheet.appendRow(["ID", "Title", "CreatedAt", "FileID"]);
  }

  return { folder, sheet };
}

function getOrSetupProgressSheet() {
  const { folder } = getOrSetupResources();
  const files = folder.getFilesByName(PROGRESS_SPREADSHEET_NAME);
  let sheet;
  if (files.hasNext()) {
    const file = files.next();
    sheet = SpreadsheetApp.openById(file.getId()).getActiveSheet();
  } else {
    const ss = SpreadsheetApp.create(PROGRESS_SPREADSHEET_NAME);
    const file = DriveApp.getFileById(ss.getId());
    file.moveTo(folder);
    sheet = ss.getActiveSheet();
    sheet.appendRow(["ID", "Date", "Summary", "PracticeTopic", "BooksRead"]);
  }
  return sheet;
}

function saveStory(story) {
  const { folder, sheet } = getOrSetupResources();
  
  // Create JSON file
  const safeTitle = (story.title || "Untitled").replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${safeTitle}_${story.createdAt}.json`;
  const content = JSON.stringify(story);
  
  const existingRowIndex = findRowIndexById(sheet, story.id);
  
  let file;
  if (existingRowIndex > 0) {
    // Update
    const oldFileId = sheet.getRange(existingRowIndex, 4).getValue();
    try {
      if (oldFileId) DriveApp.getFileById(oldFileId).setTrashed(true);
    } catch(e) { /* ignore if already missing */ }
    
    file = folder.createFile(fileName, content, "application/json");
    
    // Update row
    sheet.getRange(existingRowIndex, 2).setValue(story.title);
    sheet.getRange(existingRowIndex, 3).setValue(story.createdAt);
    sheet.getRange(existingRowIndex, 4).setValue(file.getId());
  } else {
    // Create New
    file = folder.createFile(fileName, content, "application/json");
    sheet.appendRow([story.id, story.title, story.createdAt, file.getId()]);
  }
  
  return story;
}

function saveProgress(progress) {
  const sheet = getOrSetupProgressSheet();
  sheet.appendRow([
    progress.id, 
    progress.date, 
    progress.summary, 
    progress.practiceTopic, 
    JSON.stringify(progress.booksRead)
  ]);
}

function deleteStory(id) {
  const { sheet } = getOrSetupResources();
  const rowIndex = findRowIndexById(sheet, id);
  
  if (rowIndex > 0) {
    const fileId = sheet.getRange(rowIndex, 4).getValue();
    try {
      if (fileId) DriveApp.getFileById(fileId).setTrashed(true);
    } catch (e) { /* ignore */ }
    sheet.deleteRow(rowIndex);
  }
}

function getAllStories() {
  const { sheet } = getOrSetupResources();
  const data = sheet.getDataRange().getValues();
  // Header is row 0. Data starts row 1.
  if (data.length <= 1) return [];
  
  const stories = [];
  // Iterate backwards to get newest first, limit to 20 for performance
  const limit = 20;
  let count = 0;
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (count >= limit) break;
    const row = data[i];
    const fileId = row[3];
    
    try {
      if (fileId) {
        const file = DriveApp.getFileById(fileId);
        const jsonContent = file.getBlob().getDataAsString();
        stories.push(JSON.parse(jsonContent));
        count++;
      }
    } catch (e) {
      // If file missing or deleted, ignore
      console.log("Error reading file " + fileId);
    }
  }
  
  return stories;
}

function getAllProgress() {
  const sheet = getOrSetupProgressSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const progressList = [];
  // Latest 20 entries
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    progressList.push({
      id: row[0],
      date: row[1],
      summary: row[2],
      practiceTopic: row[3],
      booksRead: JSON.parse(row[4] || "[]")
    });
    if (progressList.length >= 20) break;
  }
  return progressList;
}

function findRowIndexById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      return i + 1; // 1-based index
    }
  }
  return -1;
}
