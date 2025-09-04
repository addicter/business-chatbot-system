(async function() {
  const $ = (selector) => document.querySelector(selector);
  
  // Elements
  const chat = $('#chatMessages');
  const messageInput = $('#messageInput');
  const sendButton = $('#sendButton');
  const contactModal = $('#contactModal');
  const contactForm = $('#contactForm');
  
  // State
  let token = '';
  let business = {};
  let isTyping = false;
  
  // Get chat hash from URL
  const chatHash = location.pathname.split('/').pop();
  
  // Initialize
  async function initialize() {
    try {
      // Get business info using hash
      const businessResponse = await fetch(`/api/business/${chatHash}`);
      if (!businessResponse.ok) {
        throw new Error('Business not found');
      }
      
      business = await businessResponse.json();
      updateBusinessInfo();
      
      // Initialize chat session
      const sessionResponse = await fetch('/api/chat/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatHash: chatHash })
      });
      
      const sessionData = await sessionResponse.json();
      token = sessionData.sessionToken;
      
      // Show welcome message
      addMessage('bot', business.welcomeMessage || 'Hi! How can I help you today?');
      showSuggestions(['Tell me about your services', 'Pricing information', 'How to contact you', 'Business hours']);
      
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      addMessage('bot', 'Sorry, I\'m having trouble connecting. Please refresh the page or contact us directly.');
    }
  }
  
  function updateBusinessInfo() {
    document.getElementById('businessName').textContent = business.name;
    
    if (business.logo_url) {
      document.getElementById('businessLogo').src = business.logo_url;
    }
    
    // Update CSS custom properties for colors
    if (business.primary_color) {
      document.documentElement.style.setProperty('--primary-color', business.primary_color);
    }
    if (business.secondary_color) {
      document.documentElement.style.setProperty('--secondary-color', business.secondary_color);
    }
    
    // Update page title
    document.title = `Chat with ${business.name}`;
  }
  
  async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isTyping) return;
    
    messageInput.value = '';
    addMessage('user', message);
    
    isTyping = true;
    sendButton.disabled = true;
    const typingMessage = showTypingIndicator();
    
    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });
      
      const data = await response.json();
      
      removeTypingIndicator(typingMessage);
      addMessage('bot', data.response);
      
      if (data.suggestions && data.suggestions.length > 0) {
        showSuggestions(data.suggestions);
      }
      
      if (data.showContactForm) {
        setTimeout(() => showContactModal(), 1000);
      }
      
    } catch (error) {
      removeTypingIndicator(typingMessage);
      addMessage('bot', 'Sorry, I had trouble processing your message. Please try again.');
    } finally {
      isTyping = false;
      sendButton.disabled = false;
    }
  }
  
  function addMessage(sender, content) {
    // Implementation remains the same as before
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.innerHTML = content.replace(/\n/g, '<br>');
    chat.appendChild(messageDiv);
    chat.scrollTop = chat.scrollHeight;
  }
  
  function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing';
    typingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    chat.appendChild(typingDiv);
    chat.scrollTop = chat.scrollHeight;
    return typingDiv;
  }
  
  function removeTypingIndicator(typingMessage) {
    if (typingMessage && typingMessage.parentNode) {
      typingMessage.parentNode.removeChild(typingMessage);
    }
  }
  
  function showSuggestions(suggestions) {
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'suggestions';
    
    suggestions.forEach(suggestion => {
      const suggestionSpan = document.createElement('span');
      suggestionSpan.className = 'suggestion';
      suggestionSpan.textContent = suggestion;
      suggestionSpan.onclick = () => {
        messageInput.value = suggestion;
        sendMessage();
      };
      suggestionsDiv.appendChild(suggestionSpan);
    });
    
    chat.appendChild(suggestionsDiv);
    chat.scrollTop = chat.scrollHeight;
  }
  
  function showContactModal() {
    contactModal.classList.add('show');
  }
  
  function hideContactModal() {
    contactModal.classList.remove('show');
  }
  
  // Event listeners
  sendButton.onclick = sendMessage;
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Initialize the app
  initialize();
})();