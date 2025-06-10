import { observer } from 'mobx-react-lite';
import { aiChatStore } from './AIChatStore';
import {
  PaperAirplaneIcon,
  XMarkIcon,
  MinusIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

const AIChat = observer(() => {
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiChatStore.currentMessage.trim()) {
      aiChatStore.sendMessage();
    }
  };

  if (!aiChatStore.isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
        onClick={aiChatStore.closeChat}
      />
      
      {/* Chat Panel */}
      <div className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
        aiChatStore.isMinimized ? 'translate-x-full' : 'translate-x-0'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium">AI Assistant</h3>
              <p className="text-blue-100 text-xs">Fraud Detection Helper</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={aiChatStore.minimizeChat}
              className="p-1.5 text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <button
              onClick={aiChatStore.closeChat}
              className="p-1.5 text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {aiChatStore.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 ${message.sender === 'user' ? 'ml-2' : 'mr-2'}`}>
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    message.sender === 'user' ? 'bg-blue-600' : 'bg-gray-600'
                  }`}>
                    {message.sender === 'user' ? (
                      <UserIcon className="h-3 w-3 text-white" />
                    ) : (
                      <CpuChipIcon className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>
                <div className={`px-3 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {aiChatStore.isTyping && (
            <div className="flex justify-start">
              <div className="flex max-w-[80%]">
                <div className="flex-shrink-0 mr-2">
                  <div className="h-6 w-6 rounded-full bg-gray-600 flex items-center justify-center">
                    <CpuChipIcon className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="px-3 py-2 rounded-lg bg-gray-100">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="border-t border-gray-200 p-3 bg-gray-50 flex-shrink-0">
          <p className="text-xs text-gray-600 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-1">
            {aiChatStore.quickActions.map((action) => (
              <button
                key={action}
                onClick={() => aiChatStore.setCurrentMessage(action)}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Input Section */}
        <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              type="text"
              value={aiChatStore.currentMessage}
              onChange={(e) => aiChatStore.setCurrentMessage(e.target.value)}
              placeholder="Ask me anything about fraud detection..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={aiChatStore.isTyping}
            />
            <button
              type="submit"
              disabled={!aiChatStore.currentMessage.trim() || aiChatStore.isTyping}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Minimized State */}
      {aiChatStore.isMinimized && (
        <div className="fixed bottom-20 right-4 z-50">
          <button
            onClick={aiChatStore.restoreChat}
            className="bg-blue-600 text-white p-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors relative"
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6" />
            {aiChatStore.hasUnreadMessages && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            )}
          </button>
          {aiChatStore.lastMessage && (
            <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 max-w-48">
              <p className="text-xs text-gray-600 truncate">
                {aiChatStore.lastMessage.content.substring(0, 50)}...
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
});

export default AIChat;