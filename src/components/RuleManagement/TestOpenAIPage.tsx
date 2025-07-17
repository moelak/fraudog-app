import React from 'react';
import TestOpenAI from './TestOpenAI';

const TestOpenAIPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">OpenAI API Tester</h1>
        <TestOpenAI />
      </div>
    </div>
  );
};

export default TestOpenAIPage;
