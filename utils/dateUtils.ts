export const getGameDateKey = (): string => {
  // Get current date in ET
  const etDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));

  // Word changes at 8 AM ET. If it's before 8 AM ET, we're on the previous day's puzzle.
  if (etDate.getHours() < 8) {
    etDate.setDate(etDate.getDate() - 1);
  }

  const year = etDate.getFullYear();
  const month = String(etDate.getMonth() + 1).padStart(2, '0');
  const day = String(etDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getTimeToNextGame = (): number => {
  const now = new Date();
  const etNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

  // Create a new date object for the next 8 AM ET
  const nextGameET = new Date(etNow);
  nextGameET.setHours(8, 0, 0, 0);

  // If it's already past 8 AM ET today, the next game is 8 AM ET tomorrow
  if (etNow.getHours() >= 8) {
    nextGameET.setDate(nextGameET.getDate() + 1);
  }
  
  // Calculate difference in milliseconds
  return nextGameET.getTime() - etNow.getTime();
};