# Gemini API Error Handling Guide

This document describes all possible error codes from the Gemini API and their solutions.

## Error Codes Reference

| HTTP Code | Status | Description | Example | Solution |
|-----------|--------|-------------|---------|----------|
| **400** | `INVALID_ARGUMENT` | The request body is malformed. | There is a typo, or a missing required field in your request. | Check the API reference for request format, examples, and supported versions. Using features from a newer API version with an older endpoint can cause errors. |
| **400** | `FAILED_PRECONDITION` | Gemini API free tier is not available in your country. | You are making a request in a region where the free tier is not supported, and you have not enabled billing on your project in Google AI Studio. | To use the Gemini API, you will need to setup a paid plan using Google AI Studio. |
| **403** | `PERMISSION_DENIED` | Your API key doesn't have the required permissions. | You are using the wrong API key; you are trying to use a tuned model without going through proper authentication. | Check that your API key is set and has the right access. And make sure to go through proper authentication to use tuned models. |
| **404** | `NOT_FOUND` | The requested resource wasn't found. | An image, audio, or video file referenced in your request was not found. | Check if all parameters in your request are valid for your API version. |
| **429** | `RESOURCE_EXHAUSTED` | You've exceeded the rate limit. | You are sending too many requests per minute with the free tier Gemini API. | Verify that you're within the model's rate limit. Request a quota increase if needed. |
| **500** | `INTERNAL` | An unexpected error occurred on Google's side. | Your input context is too long. | Reduce your input context or temporarily switch to another model (e.g. from Gemini 1.5 Pro to Gemini 1.5 Flash) and see if it works. Or wait a bit and retry your request. If the issue persists after retrying, please report it using the Send feedback button in Google AI Studio. |
| **503** | `UNAVAILABLE` | The service may be temporarily overloaded or down. | The service is temporarily running out of capacity. | Temporarily switch to another model (e.g. from Gemini 1.5 Pro to Gemini 1.5 Flash) and see if it works. Or wait a bit and retry your request. If the issue persists after retrying, please report it using the Send feedback button in Google AI Studio. |
| **504** | `DEADLINE_EXCEEDED` | The service is unable to finish processing within the deadline. | Your prompt (or context) is too large to be processed in time. | Set a larger 'timeout' in your client request to avoid this error. |

## Model Rate Limits

Current rate limits for available models:

| Model | Rate Limit | Usage |
|-------|------------|-------|
| `gemini-2.5-flash` | 3 RPM | Primary - balanced speed and quality |
| `gemini-2.0-flash-lite` | 5 RPM | Fallback 1 - fastest, lightweight |
| `gemini-2.5-flash-lite` | 3 RPM | Fallback 2 - fast, lightweight |
| `gemini-2.0-flash` | 3 RPM | Fallback 3 - balanced |
| `gemini-2.5-pro` | 1 RPM | Premium - highest quality |

## Automatic Fallback System

The application includes an automatic fallback mechanism that:

1. Attempts to use the primary model first
2. If the model is overloaded (503) or rate limited (429), automatically tries fallback models
3. Notifies the user which model was successfully used
4. Only retries for temporary issues (not for auth or invalid model errors)

## Error Handling in Code

The application handles errors gracefully with:

- **User-friendly messages**: Clear explanations of what went wrong
- **Automatic retries**: For temporary issues like overload or rate limits
- **Detailed logging**: Console logs for debugging
- **Model fallback**: Automatic switching to alternative models
- **Rate limit awareness**: Prevents exceeding API quotas

## Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Ensure `.env` file exists with `NEXT_PUBLIC_GEMINI_API_KEY=your_key_here`
   - Restart the development server after adding the key

2. **"Permission denied"**
   - Verify your API key is valid
   - Check that the key has not expired
   - Ensure billing is enabled if required in your region

3. **"Rate limit exceeded"**
   - Wait a few seconds before retrying
   - Use a model with higher rate limits (e.g., `gemini-2.0-flash-lite`)
   - Consider implementing client-side rate limiting

4. **"Model overloaded"**
   - The automatic fallback will try alternative models
   - If all models fail, wait a few minutes and try again
   - Consider using off-peak hours for better availability

5. **"Input too large"**
   - Reduce the size of your resume or job description
   - Split large documents into smaller sections
   - Use a more powerful model like `gemini-2.5-pro` (slower but handles larger contexts)

## Best Practices

1. **Always set API keys as environment variables**, never hardcode them
2. **Implement retry logic** for temporary failures (already included in the app)
3. **Monitor rate limits** and adjust request frequency accordingly
4. **Use appropriate models** - faster models for simple tasks, pro models for complex analysis
5. **Handle errors gracefully** with user-friendly messages
6. **Log errors for debugging** but don't expose sensitive information to users
7. **Test with different file sizes** to ensure robustness

## Getting Your API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` file
5. Enable billing if required in your region

## Support

If you encounter persistent issues:

1. Check the [Google AI Studio documentation](https://ai.google.dev/docs)
2. Review error logs in the browser console and terminal
3. Verify your API key is valid and has proper permissions
4. Report issues using the "Send feedback" button in Google AI Studio
