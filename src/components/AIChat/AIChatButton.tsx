import { observer } from 'mobx-react-lite';
import { aiChatStore } from './AIChatStore';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

const AIChatButton = observer(() => {
  if (aiChatStore.isOpen) return null;

  return (
    <button
      onClick={aiChatStore.openChat}
      className="fixed bottom-4 right-4 z-40 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 hover:scale-110 group"
    >
      <ChatBubbleLeftRightIcon className="h-6 w-6" />
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
          AI Assistant
          <div className="absolute top-full right-2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
      
      {/* Pulse animation for attention */}
      <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20"></div>
    </button>
  );
});

export default AIChatButton;