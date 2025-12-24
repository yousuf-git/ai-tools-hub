const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

async function listAvailableModels() {
  try {
    console.log('Fetching available models from Google Generative AI API...\n');
    
    // Fetch the list of models
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + 
      (process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const models = data.models || [];
    
    console.log('Available Models:');
    console.log('='.repeat(80));
    
    models.forEach((model, index) => {
      console.log(`\n${index + 1}. Model Name: ${model.name}`);
      console.log(`   Display Name: ${model.displayName || 'N/A'}`);
      console.log(`   Description: ${model.description || 'N/A'}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log(`   Input Token Limit: ${model.inputTokenLimit || 'N/A'}`);
      console.log(`   Output Token Limit: ${model.outputTokenLimit || 'N/A'}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal models available: ${models.length}`);
    
    // Filter models that support generateContent
    const contentGenModels = models.filter(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    console.log(`\nModels supporting generateContent: ${contentGenModels.length}`);
    console.log('\nFor your config, use these model names (without "models/" prefix):');
    contentGenModels.forEach(m => {
      const shortName = m.name.replace('models/', '');
      console.log(`  - '${shortName}'`);
    });
    
  } catch (error) {
    console.error('Error fetching models:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    console.error('\nMake sure your API key is valid and set in .env file as NEXT_PUBLIC_GEMINI_API_KEY');
  }
}

listAvailableModels();
