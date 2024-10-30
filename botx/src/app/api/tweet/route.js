import { GoogleGenerativeAI } from '@google/generative-ai';
import { TwitterApi } from 'twitter-api-v2';

// Validate environment variables
const validateEnvVariables = () => {
  const requiredVars = [
    'TWITTER_APP_KEY',
    'TWITTER_APP_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_SECRET',
    'GEMINI_API_KEY',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Initialize Gemini
const initializeGemini = () => {
  try {
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  } catch (error) {
    console.error('Failed to initialize Gemini:', error);
    throw new Error('Gemini initialization failed');
  }
};

// Initialize Twitter client
const initializeTwitterClient = () => {
  try {
    if (!process.env.TWITTER_APP_KEY || !process.env.TWITTER_APP_SECRET) {
      throw new Error('Twitter consumer tokens are missing');
    }

    return new TwitterApi({
      appKey: process.env.TWITTER_APP_KEY,
      appSecret: process.env.TWITTER_APP_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
  } catch (error) {
    console.error('Failed to initialize Twitter client:', error);
    throw error;
  }
};

// Function to generate tweet content using Gemini
async function generateTweetContent(genAI) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const prompt = `Generate a tweet in the style of Om Bhojane, an AI developer and researcher who is passionate about core technologies and building/shipping products. Om's tweets have a pro content writer style - they are well-written, informative, and highlight his technical expertise and excitement for his work, particularly around AI, ML, and hackathons. Om's tweets often share insights, updates, or tips related to his projects and areas of interest, occasionally with a touch of humor or enthusiasm. Avoid dark humor or exaggerated hype. Keep the tone positive and focused on adding value for fellow developers and researchers.
Example Om Bhojane Tweets:
1:"Devs, what's your go-to stack for building a waitlist page in <24 hours? 🚀"
2:"SMILE for India is here to bridge gap between CRMs & Indian data essence.

Our plugin for CRMs offers Customer Segmentation for Indian data - bringing with our model 'Smile-small', fine-tuned on Qwen-1.5B SLM giving high accurate responses for Indian gestures so well
#MumbaiHacks"

3: "Man with the coldest LinkedIn Profile - Jensen in the house! ⚡"
4: "Jensen x {Akshay Kumar, Mukesh Ambani} 🪄
AI is not a buzzword anymore.
From superstars to businessmen talking about it, wisely, a vision of AI use cases in all sectors!"

5: "A Readme PR made my day!! A contributor added update readme issue and I also assigned it casually. Then a PR came, when I tested it I was amazed! I got to know that explainableai has been used by 2000+ users so far! Wrapped up with day 2 of Hactoberfest with unbelievable PRs:)."
`

  try {
    const result = await model.generateContent(prompt);
    const tweet = result.response.text();
    return tweet.slice(0, 280);
  } catch (error) {
    console.error('Error generating tweet content:', error);
    throw error;
  }
}

// Main handler function
export async function GET(req) {
  try {
    // Verify the request is coming from Vercel Cron
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    // Validate environment variables first
    validateEnvVariables();

    // Initialize services
    const genAI = initializeGemini();
    const twitterClient = initializeTwitterClient();

    // Generate and post tweet
    const tweetContent = await generateTweetContent(genAI);
    const tweet = await twitterClient.v2.tweet(tweetContent);

    return Response.json({ 
      success: true, 
      message: 'Tweet posted successfully',
      content: tweetContent,
      tweetId: tweet.data.id
    });

  } catch (error) {
    console.error('Error in tweet posting:', error);
    
    // Return appropriate error response
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to post tweet',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { 
      status: error.message?.includes('Unauthorized') ? 401 : 500 
    });
  }
}

// Export config for Vercel Cron
export const config = {
  maxDuration: 300
};