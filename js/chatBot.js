/**
 * @file chatBot.js
 * @description ChatBot UI Handler with Google Gemini Integration
 */

/** Gemini API Config */
// Populated at runtime by loadConfig(); not hardcoded to keep the key out of source
let GEMINI_API_KEY = "";
let GEMINI_API_URL = "";

/** Load Config */
// Fetches the Gemini API key from config.json and builds the request URL.
// NOTE: Loading an API key from a client-accessible file is not production-safe;
// acceptable here for the scope of this project only.
async function loadConfig() {
  try {
    const response = await fetch("../config.json");
    const config = await response.json();
    GEMINI_API_KEY = config.geminiKey;
    GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  } catch (error) {
    console.error("Failed to load configuration:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {

  /** Init */
  await loadConfig();

  /** Element References */
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const attachmentBtn = document.querySelector(".attachment-btn");
  const clearChatBtn = document.querySelector(".chat-actions button");

  // Holds files selected via the attachment button before they are sent
  let attachedFiles = [];

  /** Display Attached Files */
  // Rebuilds the file preview area above the input on every change.
  // Removes the existing preview first to avoid duplicates, then re-renders
  // from the current attachedFiles array. Each item has a remove button.
  function displayAttachedFiles() {
    const existingPreview = document.querySelector(".file-preview");
    if (existingPreview) {
      existingPreview.remove();
    }

    if (attachedFiles.length === 0) return;

    const previewDiv = document.createElement("div");
    previewDiv.className = "file-preview";

    attachedFiles.forEach((file, index) => {
      const fileItem = document.createElement("div");
      fileItem.className = "file-item";

      // Use an image icon for image files, generic file icon for everything else
      const icon = file.type.startsWith("image/") ? "fa-image" : "fa-file";

      fileItem.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span class="file-name">${file.name}</span>
        <button class="remove-file-btn" data-index="${index}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;

      previewDiv.appendChild(fileItem);
    });

    const inputContainer = document.querySelector(".input-container");
    inputContainer.parentElement.insertBefore(previewDiv, inputContainer);

    // Re-attach remove button listeners after every rebuild since
    // innerHTML replacement destroys previous event bindings
    document.querySelectorAll(".remove-file-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        attachedFiles.splice(index, 1);
        displayAttachedFiles();
      });
    });
  }

  /** Clear Chat */
  // Removes all messages except the first (the hardcoded greeting) and
  // clears any pending file attachments
  function clearChat() {
    const messages = chatMessages.querySelectorAll(".message");
    messages.forEach((message, index) => {
      if (index > 0) {
        message.remove();
      }
    });
    attachedFiles = [];
    displayAttachedFiles();
  }

  /** Append Message */
  // Creates and appends a chat bubble to #chat-messages.
  // isUser controls the bubble alignment and style class.
  // Files are rendered inline — images as <img> tags, others as file name items.
  // Auto-scrolls to the bottom after appending.
  function appendMessage(text, isUser = false, files = []) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isUser ? "user-message" : "bot-message"}`;

    // Build file attachment HTML if any files were sent with this message
    let filesHTML = "";
    if (files.length > 0) {
      filesHTML = '<div class="message-files">';
      files.forEach((file) => {
        if (file.type.startsWith("image/")) {
          filesHTML += `<img src="${URL.createObjectURL(file)}" alt="${file.name}" class="message-image">`;
        } else {
          filesHTML += `
            <div class="message-file-item">
              <i class="fa-solid fa-file"></i>
              <span>${file.name}</span>
            </div>
          `;
        }
      });
      filesHTML += "</div>";
    }

    messageDiv.innerHTML = `
      ${filesHTML}
      <div class="message-content">${text}</div>
      <div class="message-time">${timeStr}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /** Get Gemini Response */
  // Sends the user's message to the Gemini API with a system prompt that
  // constrains the bot to HelpDesk support topics.
  // Returns the response text, or a user-facing error string on failure.
  async function getGeminiResponse(userMessage) {
    try {
      // System prompt scopes Gemini's responses to IT support context
      const systemPrompt = `You are a helpful HelpDesk support assistant. Your role is to:
- Help users submit and track support tickets
- Answer common technical support questions
- Guide users through troubleshooting steps
- Provide information about ticket status and priorities
- Be friendly, professional, and concise in your responses
- If a user needs to create a ticket, guide them to use the ticket submission form
- Keep responses clear and actionable

Remember: You're representing a professional IT support team. Be patient and understanding with users who may be frustrated or confused.

User: ${userMessage}`;

      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      // Drill into Gemini's nested response structure to extract the text
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (
          candidate.content &&
          candidate.content.parts &&
          candidate.content.parts.length > 0
        ) {
          return candidate.content.parts[0].text;
        }
      }

      throw new Error("Unexpected response structure from Gemini API");
    } catch (error) {
      console.error("Gemini API Error:", error);
      return `Sorry, I encountered an error: ${error.message}. Please try again later.`;
    }
  }

  /** Handle Send Message */
  // Validates input, appends the user message, clears the input and file list,
  // shows a typing indicator while waiting for Gemini, then appends the response.
  async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text && attachedFiles.length === 0) return;

    // Snapshot the attached files for this message before clearing the array
    const messageFiles = [...attachedFiles];

    appendMessage(text || "📎 Sent attachments", true, messageFiles);
    userInput.value = "";

    // Clear attachments after sending
    attachedFiles = [];
    displayAttachedFiles();

    // Show animated typing indicator while the API request is in flight
    const typingDiv = document.createElement("div");
    typingDiv.className = "message bot-message typing-indicator";
    typingDiv.innerHTML = `
      <div class="message-content">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const aiResponse = await getGeminiResponse(text || "User sent attachments");

    // Remove the typing indicator before appending the real response
    typingDiv.remove();

    appendMessage(aiResponse, false);
  }

  /** Event Listeners */

  // Send button click
  sendBtn.addEventListener("click", handleSendMessage);

  // Send on Enter key press
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  });

  // Quick action option buttons rendered inside chat messages
  chatMessages.addEventListener("click", (e) => {
    if (e.target.classList.contains("option-btn")) {
      const optionText = e.target.textContent;
      appendMessage(optionText, true);

      // Simulate a bot response after a short delay
      setTimeout(() => {
        appendMessage(
          `You selected: "${optionText}". In a real implementation, this would trigger a specific workflow or query.`,
          false,
        );
      }, 800);
    }
  });

  // Attachment button: creates a hidden file input and triggers it on click
  attachmentBtn.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.accept = "image/*,.pdf,.doc,.docx,.txt";

    fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      attachedFiles.push(...files);
      displayAttachedFiles();
    });

    // Programmatically trigger the file picker dialog
    fileInput.click();
  });

  // Clear chat button: prompts for confirmation before wiping the history
  clearChatBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      clearChat();
    }
  });

  // Scroll to the bottom on initial load in case the greeting message is tall
  chatMessages.scrollTop = chatMessages.scrollHeight;
});