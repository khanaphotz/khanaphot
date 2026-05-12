/**
 * [DMK] Room Reservation - Email Notification Service
 * 
 * Instructions:
 * 1. Open https://script.google.com/
 * 2. Create a new project.
 * 3. Paste this code.
 * 4. Click "Deploy" -> "New Deployment".
 * 5. Select type "Web App".
 * 6. Set "Execute as" to "Me".
 * 7. Set "Who has access" to "Anyone" (This is required for simple fetch).
 * 8. Copy the Web App URL and set it in your AI Studio Secrets as VITE_GAS_WEBAPP_URL
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    const recipientEmail = data.recipientEmail;
    const subject = data.subject || "[DMK] Room Reservation Notification";
    const body = data.body || "No content provided.";
    
    if (!recipientEmail) {
      throw new Error("Recipient email is required");
    }

    // Send the email
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      body: body
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Email sent successfully"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Support for simple verification
function doGet(e) {
  return ContentService.createTextOutput("Google Apps Script Email Service is active.").setMimeType(ContentService.MimeType.TEXT);
}
