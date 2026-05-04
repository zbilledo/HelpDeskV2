/**
 * ChatBot UI Handler with Google Gemini Integration
 * --------------------------------------------------
 * This script handles the UI interactivity for the chatbot page
 * and integrates with Google Gemini AI for intelligent responses.
 */

// Google Gemini API Configuration
let GEMINI_API_KEY = "";
let GEMINI_API_URL = "";

// Load configuration from config.json
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
  // Load API key from config (I know this is not ideal but for the context of this project it will be okay. Would not send this to production though)
  await loadConfig();

  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const attachmentBtn = document.querySelector(".attachment-btn");
  const clearChatBtn = document.querySelector(".chat-actions button");

  // Array to store attached files
  let attachedFiles = [];

  /**
   * Displays attached files in the input area
   */
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

    // Add event listeners for remove buttons
    document.querySelectorAll(".remove-file-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        attachedFiles.splice(index, 1);
        displayAttachedFiles();
      });
    });
  }

  /**
   * Clears all chat messages except the initial greeting
   */
  function clearChat() {
    const messages = chatMessages.querySelectorAll(".message");
    messages.forEach((message, index) => {
      // Keep only the first message (greeting)
      if (index > 0) {
        message.remove();
      }
    });
    attachedFiles = [];
    displayAttachedFiles();
  }

  /**
   * Appends a message to the chat container
   * @param {string} text - Message text
   * @param {boolean} isUser - Whether the message is from the user
   * @param {Array} files - Optional array of files to display with the message
   */
  function appendMessage(text, isUser = false, files = []) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isUser ? "user-message" : "bot-message"}`;

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
            <div class="message-content">
                ${text}
            </div>
            <div class="message-time">${timeStr}</div>
        `;

    chatMessages.appendChild(messageDiv);

    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Calls Google Gemini API to get a response
   * @param {string} userMessage - The user's message
   * @returns {Promise<string>} - The AI response
   */
  async function getGeminiResponse(userMessage) {
    try {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: systemPrompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      // Extract the response text from Gemini's response structure
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

  /**
   * Handles sending a message
   */
  async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text && attachedFiles.length === 0) return;

    // Create a copy of attached files for this message
    const messageFiles = [...attachedFiles];

    // Append User Message with files
    appendMessage(text || "📎 Sent attachments", true, messageFiles);
    userInput.value = "";

    // Clear attached files after sending
    attachedFiles = [];
    displayAttachedFiles();

    // Show typing indicator
    const typingDiv = document.createElement("div");
    typingDiv.className = "message bot-message typing-indicator";
    typingDiv.innerHTML = `
            <div class="message-content">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
        `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Get AI Response from Gemini
    const aiResponse = await getGeminiResponse(text || "User sent attachments");

    // Remove typing indicator
    typingDiv.remove();

    // Append AI Response
    appendMessage(aiResponse, false);
  }

  // Event Listeners
  sendBtn.addEventListener("click", handleSendMessage);

  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  });

  // Handle Quick Action Buttons
  chatMessages.addEventListener("click", (e) => {
    if (e.target.classList.contains("option-btn")) {
      const optionText = e.target.textContent;
      appendMessage(optionText, true);

      setTimeout(() => {
        appendMessage(
          `You selected: "${optionText}". In a real implementation, this would trigger a specific workflow or query.`,
          false,
        );
      }, 800);
    }
  });

  // Handle File Attachment
  attachmentBtn.addEventListener("click", () => {
    // Create a hidden file input
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.accept = "image/*,.pdf,.doc,.docx,.txt";

    fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      attachedFiles.push(...files);
      displayAttachedFiles();
    });

    fileInput.click();
  });

  // Handle Clear Chat
  clearChatBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      clearChat();
    }
  });

  // Initial scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
});
