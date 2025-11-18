export const getGameDateKey = (): string => {
  const etDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
   // The game day rolls over at 8 AM Eastern Time.
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
  const nextGameET = new Date(etNow);
  
  // Set to 8:00:00 AM ET for the next game
  nextGameET.setHours(8, 0, 0, 0);

  // If it's already past 8 AM ET today, the next game is tomorrow
  if (etNow.getHours() >= 8) {
    nextGameET.setDate(nextGameET.getDate() + 1);
  }
  
  return nextGameET.getTime() - etNow.getTime();
};
