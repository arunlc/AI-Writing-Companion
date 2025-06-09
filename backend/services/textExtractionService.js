// backend/services/textExtractionService.js - NEW FILE
const fs = require('fs').promises;
const path = require('path');

class TextExtractionService {
  constructor() {
    // You can add different extraction libraries here
    // For now, we'll use basic implementations
  }

  /**
   * Extract text from various document formats
   * @param {string} filePath - Path to the uploaded file
   * @param {string} mimeType - MIME type of the file
   * @returns {Promise<string>} - Extracted text content
   */
  async extractText(filePath, mimeType, originalName) {
    console.log(`📄 Extracting text from: ${originalName} (${mimeType})`);

    try {
      switch (mimeType) {
        case 'text/plain':
          return await this.extractFromTxt(filePath);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractFromDocx(filePath);
        
        case 'application/msword':
          return await this.extractFromDoc(filePath);
        
        case 'application/pdf':
          return await this.extractFromPdf(filePath);
        
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error(`❌ Text extraction failed for ${originalName}:`, error);
      throw new Error(`Failed to extract text from ${originalName}: ${error.message}`);
    }
  }

  /**
   * Extract text from plain text files
   */
  async extractFromTxt(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return this.cleanText(content);
    } catch (error) {
      throw new Error(`Failed to read text file: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX files
   * Note: Install 'mammoth' package for production use
   */
  async extractFromDocx(filePath) {
    try {
      // For production, use mammoth library:
      // const mammoth = require('mammoth');
      // const result = await mammoth.extractRawText({ path: filePath });
      // return this.cleanText(result.value);

      // For demo purposes, return placeholder
      return this.getMockContent(path.basename(filePath));
    } catch (error) {
      throw new Error(`Failed to extract from DOCX: ${error.message}`);
    }
  }

  /**
   * Extract text from DOC files
   * Note: Install 'textract' package for production use
   */
  async extractFromDoc(filePath) {
    try {
      // For production, use textract library:
      // const textract = require('textract');
      // return new Promise((resolve, reject) => {
      //   textract.fromFileWithPath(filePath, (error, text) => {
      //     if (error) reject(error);
      //     else resolve(this.cleanText(text));
      //   });
      // });

      // For demo purposes, return placeholder
      return this.getMockContent(path.basename(filePath));
    } catch (error) {
      throw new Error(`Failed to extract from DOC: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF files
   * Note: Install 'pdf-parse' package for production use
   */
  async extractFromPdf(filePath) {
    try {
      // For production, use pdf-parse library:
      // const fs = require('fs');
      // const pdf = require('pdf-parse');
      // const dataBuffer = fs.readFileSync(filePath);
      // const data = await pdf(dataBuffer);
      // return this.cleanText(data.text);

      // For demo purposes, return placeholder
      return this.getMockContent(path.basename(filePath));
    } catch (error) {
      throw new Error(`Failed to extract from PDF: ${error.message}`);
    }
  }

  /**
   * Clean and normalize extracted text
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')       // Remove excessive line breaks
      .replace(/\t/g, ' ')              // Replace tabs with spaces
      .replace(/  +/g, ' ')             // Replace multiple spaces with single space
      .trim();                          // Remove leading/trailing whitespace
  }

  /**
   * Generate mock content for demo purposes
   * In production, this would be replaced with actual extraction
   */
  getMockContent(fileName) {
    const lowerFileName = fileName.toLowerCase();
    
    if (lowerFileName.includes('spy') || lowerFileName.includes('thriller') || lowerFileName.includes('midnight')) {
      return `The Shadow's Edge

Agent Sarah Chen crouched behind the marble pillar, her breath barely audible in the silent museum corridor. The artifact she'd been tracking for months—the encrypted drive containing state secrets—lay just twenty feet away in the display case.

But something was wrong. The security system she'd hacked showed no guards, yet she could sense eyes watching her every movement. The hair on the back of her neck stood up as footsteps echoed from the adjacent hall.

"I know you're here, Agent Chen," a familiar voice called out from the darkness. It was Viktor Kozlov, the Russian operative she thought she'd left for dead in Prague. "The drive you're after? It's not what you think it is."

Sarah's mind raced. How had he found her? More importantly, how was he still alive? She reached for the encrypted communicator in her jacket, but her fingers found only empty fabric. Her backup team was compromised.

The moonlight streaming through the skylight cast eerie shadows across the ancient artifacts. Each piece told a story of civilizations past, but tonight, they would witness the writing of a new chapter in the world of international espionage.

She had two choices: retreat and lose the intelligence that could prevent a global crisis, or advance knowing it might be her final mission. The sound of Viktor's footsteps grew closer, and Sarah made her decision.

In one fluid motion, she rolled from behind the pillar and sprinted toward the display case, her lockpicks already in hand. The laser grid activated, painting red lines across her path, but she'd memorized the pattern. Duck, roll, leap—she moved like a dancer through the deadly light show.

The drive was within reach when the lights suddenly blazed on, revealing not just Viktor, but an entire team of armed operatives surrounding her. Sarah smiled grimly. She'd walked into a trap, but she'd been preparing for this moment her entire career.

"Hello, Viktor," she said, palming the drive while keeping her hands visible. "I was wondering when you'd show up to this party."

The extraction point was still three miles away through hostile territory. Sarah calculated her odds: twelve armed men, one exit, and thirty seconds before backup arrived. The drive in her pocket contained information that could save thousands of lives, but only if she could get it to safety.

She looked at Viktor and smiled. "Shall we dance?"`;
    }
    
    return `My Amazing Summer Adventure

This summer was absolutely incredible! I had so many exciting experiences that I'll remember for the rest of my life. Let me tell you about the most amazing trip my family and I took to Yellowstone National Park.

It all started when my parents surprised me and my little brother with the news that we were going camping. At first, I wasn't too excited because I love my comfortable bed and video games, but boy, was I wrong about this trip!

The drive to Yellowstone took forever – about 8 hours from our house – but it was totally worth it. When we finally arrived, the first thing that struck me was how massive and beautiful everything was. The mountains seemed to touch the clouds, and the air smelled so fresh and clean, nothing like the city air back home.

Setting up camp was an adventure in itself. Dad struggled with the tent poles while Mom organized our supplies. My brother and I were assigned the important job of gathering firewood, which turned into an epic treasure hunt through the forest. We found the most amazing pieces of wood and even discovered a family of chipmunks living in a hollow log.

On our first full day, we hiked the Grand Loop Trail. It was challenging, especially for someone like me who usually spends more time sitting than walking, but the views were absolutely breathtaking. Every turn revealed something new – bubbling hot springs, cascading waterfalls, and geysers shooting water high into the sky.

The wildlife was unbelievable! We saw elk grazing peacefully in meadows, massive bison blocking traffic (they have the right of way in Yellowstone!), and even spotted a black bear from a very safe distance. Mom made us stick together like glue whenever we saw any animals, following all the park ranger safety guidelines.

But the absolute highlight was Old Faithful. Watching that geyser erupt with such power and precision every 90 minutes was like watching nature's own clock. We must have watched it five times, and each eruption felt just as magical as the first.

The evenings were my favorite part. We'd sit around the campfire, roasting marshmallows and making s'mores while Dad told us stories about the constellations. Without all the city lights, the night sky was incredible – I had never seen so many stars! It made me feel so small but also so connected to something bigger than myself.

This trip taught me so much about appreciating nature and understanding how important it is to protect our environment. It also showed me that sometimes the best experiences don't involve technology or screens – just spending quality time with family and being present in the moment.

I'm already planning what I want to do on our next camping trip. Maybe we'll explore the Grand Canyon or visit Yosemite. Whatever adventure comes next, I know it will be amazing because I've learned that the best journeys are the ones you take with the people you love most.

Nature has so much to offer if we just take the time to look, listen, and appreciate the incredible world around us.`;
  }

  /**
   * Validate if file type is supported for text extraction
   */
  isTextExtractable(mimeType) {
    const supportedTypes = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/pdf'
    ];
    
    return supportedTypes.includes(mimeType);
  }

  /**
   * Get word count from extracted text
   */
  getWordCount(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get character count from extracted text
   */
  getCharCount(text) {
    if (!text) return 0;
    return text.length;
  }

  /**
   * Generate extraction metadata
   */
  generateMetadata(text, originalName, mimeType) {
    return {
      originalFileName: originalName,
      mimeType: mimeType,
      wordCount: this.getWordCount(text),
      characterCount: this.getCharCount(text),
      extractedAt: new Date().toISOString(),
      textLength: text.length,
      preview: text.substring(0, 200) + (text.length > 200 ? '...' : '')
    };
  }
}

module.exports = new TextExtractionService();
