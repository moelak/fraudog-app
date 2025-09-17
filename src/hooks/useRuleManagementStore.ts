import { useContext, createContext } from 'react';
import { ruleManagementStore, RuleManagementStore } from '../components/RuleManagement/RuleManagementStore';

// Create context for the store
const RuleManagementStoreContext = createContext<RuleManagementStore>(ruleManagementStore);

// Hook to use the store
export const useRuleManagementStore = () => {
  const store = useContext(RuleManagementStoreContext);
  if (!store) {
    throw new Error('useRuleManagementStore must be used within a RuleManagementStoreProvider');
  }
  return store;
};

// Provider component (optional, for dependency injection)
export const RuleManagementStoreProvider = RuleManagementStoreContext.Provider;

// Export the store instance for direct access if needed
export { ruleManagementStore };
