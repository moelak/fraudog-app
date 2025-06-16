import { observer } from 'mobx-react-lite';
import { useState, useRef, useEffect } from 'react';
import { ruleManagementStore } from './RuleManagementStore';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  ClockIcon,
  PowerIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface RuleActionsMenuProps {
  rule: {
    id: number;
    name: string;
    description: string;
    category: string;
    condition: string;
    severity: 'low' | 'medium' | 'high';
    status: 'active' | 'inactive' | 'warning';
    createdAt: string;
    updatedAt: string;
    catches: number;
    falsePositives: number;
    effectiveness: number;
  }
}

const RuleActionsMenu = observer(({ rule }: RuleActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAction = (action: string) => {
    setIsOpen(false);
    
    switch (action) {
      case 'edit':
        ruleManagementStore.editRule(rule.id);
        break;
      case 'history':
        ruleManagementStore.viewRuleHistory(rule.id);
        break;
      case 'toggle':
        ruleManagementStore.toggleRuleStatus(rule.id);
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
          ruleManagementStore.deleteRule(rule.id);
        }
        break;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
          <div className="py-1">
            <button
              onClick={() => handleAction('edit')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-3" />
              Edit Rule
            </button>
            
            <button
              onClick={() => handleAction('history')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ClockIcon className="h-4 w-4 mr-3" />
              View History
            </button>
            
            <button
              onClick={() => handleAction('toggle')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <PowerIcon className="h-4 w-4 mr-3" />
              {rule.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
            
            <div className="border-t border-gray-100 my-1"></div>
            
            <button
              onClick={() => handleAction('delete')}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-3" />
              Delete Rule
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default RuleActionsMenu;