// In-memory test data (kept for backward compatibility with test endpoints)
const testMessages: Array<{ id: number; message: string }> = [];
let nextTestId = 1;

export const addTest = (msg: string) => {
  testMessages.push({ id: nextTestId++, message: msg });
};

export const getAll = () => {
  return testMessages;
};

