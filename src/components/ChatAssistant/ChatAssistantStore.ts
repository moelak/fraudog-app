import { makeAutoObservable } from "mobx";

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

export class ChatAssistantStore {
  messages: Message[] = [
    {
      id: 1,
      content: "Hello! I'm your fraud detection assistant. I can help you with questions about fraud rules, system status, alerts, and more. How can I assist you today?",
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString()
    }
  ];

  currentMessage = '';
  isTyping = false;

  quickActions = [
    "Show me recent alerts",
    "What's the current fraud rate?",
    "How do I create a new rule?",
    "System status check",
    "Explain chargeback process"
  ];

  constructor() {
    makeAutoObservable(this);
  }

  setCurrentMessage(message: string) {
    this.currentMessage = message;
  }

  sendMessage() {
    if (!this.currentMessage.trim()) return;

    // Add user message
    const userMessage: Message = {
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
      const assistantMessage: Message = {
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
    // Simple response generation based on keywords
    if (query.includes('alert') || query.includes('recent')) {
      return "I can see you have 3 active alerts: 1 high-priority identity theft alert, 1 medium-priority payment fraud alert, and 1 resolved account takeover alert. Would you like me to provide more details about any specific alert?";
    }
    
    if (query.includes('fraud rate') || query.includes('rate')) {
      return "Your current fraud detection rate is 98.5% with a false positive rate of 0.02%. This is excellent performance! The system has prevented $2.3M in potential fraud this month.";
    }
    
    if (query.includes('rule') || query.includes('create')) {
      return "To create a new fraud detection rule, go to Rule Management and click 'Create Rule'. You'll need to define the condition (e.g., 'transaction.amount > 10000'), set the severity level, and provide a description. Would you like me to guide you through the process?";
    }
    
    if (query.includes('status') || query.includes('system')) {
      return "System status is healthy! Uptime: 99.9%, Response time: 125ms, Error rate: 0.02%. CPU usage is at 45% (warning level). All fraud detection services are operational.";
    }
    
    if (query.includes('chargeback')) {
      return "The chargeback process involves: 1) Customer disputes transaction, 2) Bank initiates chargeback, 3) You can dispute with evidence, 4) Final decision. Current stats: 47 total chargebacks, 8 pending disputes, 32 won cases. Your chargeback rate is 0.8%.";
    }
    
    if (query.includes('help') || query.includes('how')) {
      return "I can help you with: fraud detection rules, system monitoring, alert management, chargeback disputes, transaction analysis, and reporting. What specific area would you like assistance with?";
    }

    // Default response
    return "I understand you're asking about fraud detection. Could you be more specific? I can help with alerts, rules, system status, chargebacks, or general fraud prevention strategies. Feel free to ask about any aspect of the system!";
  }

  clearChat() {
    this.messages = [
      {
        id: 1,
        content: "Hello! I'm your fraud detection assistant. How can I help you today?",
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString()
      }
    ];
  }

  addQuickAction(action: string) {
    if (!this.quickActions.includes(action)) {
      this.quickActions.push(action);
    }
  }

  removeQuickAction(action: string) {
    this.quickActions = this.quickActions.filter(a => a !== action);
  }
}

export const chatAssistantStore = new ChatAssistantStore();