import { makeAutoObservable } from "mobx";

interface ChatMessage {
  id: number;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

export class AIChatStore {
  isOpen = false;
  isMinimized = false;
  currentMessage = '';
  isTyping = false;
  
  messages: ChatMessage[] = [
    {
      id: 1,
      content: "Hello! I'm your AI fraud detection assistant. I can help you with questions about fraud rules, alerts, system status, and more. How can I assist you today?",
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString()
    }
  ];

  quickActions = [
    "Show recent alerts",
    "What's the fraud rate?",
    "Create new rule",
    "System status",
    "Explain chargeback"
  ];

  constructor() {
    makeAutoObservable(this);
  }

  openChat = () => {
    this.isOpen = true;
    this.isMinimized = false;
  }

  closeChat = () => {
    this.isOpen = false;
    this.isMinimized = false;
    // Reset chat session
    this.messages = [
      {
        id: 1,
        content: "Hello! I'm your AI fraud detection assistant. How can I assist you today?",
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString()
      }
    ];
    this.currentMessage = '';
  }

  minimizeChat = () => {
    this.isMinimized = true;
  }

  restoreChat = () => {
    this.isMinimized = false;
  }

  setCurrentMessage = (message: string) => {
    this.currentMessage = message;
  }

  sendMessage = () => {
    if (!this.currentMessage.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: this.messages.length + 1,
      content: this.currentMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    this.messages.push(userMessage);
    const userQuery = this.currentMessage.toLowerCase();
    this.currentMessage = '';
    this.isTyping = true;

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: this.messages.length + 1,
        content: this.generateResponse(userQuery),
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString()
      };

      this.messages.push(assistantMessage);
      this.isTyping = false;
    }, 1500);
  }

  generateResponse(query: string): string {
    if (query.includes('alert') || query.includes('recent')) {
      return "I can see you have 3 active alerts: 1 high-priority identity theft alert, 1 medium-priority payment fraud alert, and 1 resolved account takeover alert. Would you like me to provide more details?";
    }
    
    if (query.includes('fraud rate') || query.includes('rate')) {
      return "Your current fraud detection rate is 98.5% with a false positive rate of 0.02%. This is excellent performance! The system has prevented $2.3M in potential fraud this month.";
    }
    
    if (query.includes('rule') || query.includes('create')) {
      return "To create a new fraud detection rule, go to Rule Management and click 'Create Rule'. You'll need to define the condition, set the severity level, and provide a description. Would you like me to guide you through the process?";
    }
    
    if (query.includes('status') || query.includes('system')) {
      return "System status is healthy! Uptime: 99.9%, Response time: 125ms, Error rate: 0.02%. CPU usage is at 45% (warning level). All fraud detection services are operational.";
    }
    
    if (query.includes('chargeback')) {
      return "The chargeback process involves: 1) Customer disputes transaction, 2) Bank initiates chargeback, 3) You can dispute with evidence, 4) Final decision. Current stats: 47 total chargebacks, 8 pending disputes, 32 won cases.";
    }

    return "I understand you're asking about fraud detection. Could you be more specific? I can help with alerts, rules, system status, chargebacks, or general fraud prevention strategies.";
  }

  get lastMessage() {
    return this.messages[this.messages.length - 1];
  }

  get hasUnreadMessages() {
    return this.messages.length > 1 && this.isMinimized;
  }
}

export const aiChatStore = new AIChatStore();