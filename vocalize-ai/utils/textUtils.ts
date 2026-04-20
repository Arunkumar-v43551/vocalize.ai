export interface TextToken {
  text: string;
  isWord: boolean;
  id: number;
  start?: number;
  end?: number;
}

/**
 * Splits text into tokens (words and separators) and assigns estimated timestamps
 * based on the character length of words relative to the total duration.
 */
export const processTextForTiming = (text: string, totalDuration: number): TextToken[] => {
  // Regex explanation:
  // ([^\w\u0B80-\u0BFF]+) matches one or more characters that are NOT (English word chars OR Tamil chars).
  // This effectively splits by separators while capturing them.
  const parts = text.split(/([^\w\u0B80-\u0BFF]+)/); 

  const tokens: TextToken[] = [];
  let charCount = 0;
  
  // First pass: Create tokens and count total "speakable" characters
  parts.forEach((part, index) => {
     if (!part) return;
     
     // Check if part contains alphanumeric or Tamil chars (rough heuristic for "speakable" content)
     const isWord = /[\w\u0B80-\u0BFF]/.test(part);
     
     if (isWord) {
         charCount += part.length;
     }
     
     tokens.push({ 
       text: part, 
       isWord, 
       id: index 
     });
  });

  // Second pass: Distribute duration among words
  let currentTime = 0;
  tokens.forEach(token => {
      if (token.isWord) {
          // Calculate duration proportional to length
          // We assume a linear speaking rate for estimation
          const duration = (token.text.length / charCount) * totalDuration;
          
          token.start = currentTime;
          token.end = currentTime + duration;
          
          currentTime += duration;
      }
  });

  return tokens;
};