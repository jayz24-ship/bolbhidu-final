import { AIVerdict, IPostDoc, Post } from '../models/Post.js';
import { getIO } from './socket.js';
import { EVENTS, ROOMS } from '../utils/constants.js';
import { verifyIssueWithAI } from './ai-verification.js';
import { cloudinary } from '../config/cloudinary.js';

export async function enqueueAndValidatePost(post: IPostDoc) {
  console.log(`[AI Validation] 🚀 Starting validation for post ${post._id} by user ${post.authorId}`);
  console.log(`[AI Validation] Post details: "${post.description.substring(0, 50)}..." | Category: ${post.category}`);
  
  // Set timeout to prevent posts from being stuck forever
  const timeoutMs = 30000; // 30 seconds
  const timeoutId = setTimeout(async () => {
    console.warn(`[AI Validation] ⏰ TIMEOUT: Post ${post._id} validation timed out after ${timeoutMs}ms`);
    await handleValidationFailure(post, 'AI verification timed out - please try again');
  }, timeoutMs);

  // Run AI verification asynchronously
  const processValidation = async () => {
    try {
      console.log(`[AI Validation] 🔍 Processing validation for post ${post._id}...`);
      
      // Get the first image URL if available
      let imageUrl: string | undefined;
      if (post.media.length > 0 && post.media[0].type === 'image') {
        try {
          imageUrl = cloudinary.url(post.media[0].publicId, {
            resource_type: 'image',
            transformation: [{ width: 800, crop: 'scale' }]
          });
          console.log(`[AI Validation] 🖼️ Generated image URL for post ${post._id}`);
        } catch (cloudinaryError) {
          console.warn(`[AI Validation] ⚠️ Failed to generate image URL for post ${post._id}:`, cloudinaryError);
        }
      }

      // Call AI verification service
      console.log(`[AI Validation] 🤖 Calling AI verification service for post ${post._id}...`);
      const startTime = Date.now();
      
      const aiResult = await verifyIssueWithAI(
        post.description,
        post.category,
        post.locationName,
        imageUrl
      );
      
      const duration = Date.now() - startTime;
      console.log(`[AI Validation] 📊 AI verification completed for post ${post._id} in ${duration}ms`);
      console.log(`[AI Validation] 📋 Result: valid=${aiResult.isValid}, score=${aiResult.score}, reason="${aiResult.reason}"`);

      // Determine verdict based on AI score - more lenient
      let verdict: AIVerdict;
      if (!aiResult.isValid || aiResult.score < 40) {
        verdict = 'rejected';
        console.log(`[AI Validation] ❌ Post ${post._id} REJECTED - Score ${aiResult.score} < 40 or invalid`);
      } else {
        verdict = 'accepted';
        console.log(`[AI Validation] ✅ Post ${post._id} ACCEPTED - Score ${aiResult.score} >= 40`);
      }

      // Update post with AI results
      console.log(`[AI Validation] 💾 Updating post ${post._id} in database with verdict: ${verdict}`);
      const updatedPost = await Post.findByIdAndUpdate(post._id, {
        aiVerdict: verdict,
        aiScore: aiResult.score,
        aiReasons: [aiResult.reason],
      }, { new: true });

      if (!updatedPost) {
        throw new Error(`Post ${post._id} not found when trying to update - may have been deleted`);
      }

      console.log(`[AI Validation] ✅ Database updated successfully for post ${post._id}`);

      // Clear timeout since we succeeded
      clearTimeout(timeoutId);

      // Notify user via socket
      console.log(`[AI Validation] 📡 Sending socket notification for post ${post._id} to user ${post.authorId}`);
      await sendSocketNotification(post, verdict, aiResult.score, [aiResult.reason]);

      console.log(`[AI Validation] 🎉 COMPLETE: Post ${post._id} processed successfully with verdict: ${verdict}`);
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error(`[AI Validation] 💥 ERROR processing post ${post._id}:`, error?.message || error);
      console.error(`[AI Validation] 📍 Error stack:`, error?.stack);
      
      await handleValidationFailure(post, 'AI verification failed - please try again');
    }
  };

  // Start validation process (don't await - it's async)
  processValidation().catch(async (criticalError) => {
    clearTimeout(timeoutId);
    console.error(`[AI Validation] 🚨 CRITICAL ERROR for post ${post._id}:`, criticalError);
    await handleValidationFailure(post, 'Critical validation error - please contact support');
  });
}

/**
 * Handle validation failures consistently
 */
async function handleValidationFailure(post: IPostDoc, userMessage: string) {
  try {
    console.log(`[AI Validation] 🔧 Handling validation failure for post ${post._id}`);
    
    // Update post to rejected state
    const updatedPost = await Post.findByIdAndUpdate(post._id, {
      aiVerdict: 'rejected',
      aiScore: 25,
      aiReasons: [userMessage],
    }, { new: true });

    if (!updatedPost) {
      console.error(`[AI Validation] ❌ Failed to update post ${post._id} - post may have been deleted`);
      return;
    }

    console.log(`[AI Validation] 💾 Post ${post._id} marked as rejected in database`);

    // Send socket notification
    await sendSocketNotification(post, 'rejected', 25, [userMessage]);
    
    console.log(`[AI Validation] ✅ Failure handled for post ${post._id}`);
  } catch (error) {
    console.error(`[AI Validation] 🚨 CRITICAL: Failed to handle validation failure for post ${post._id}:`, error);
  }
}

/**
 * Send socket notification with error handling
 */
async function sendSocketNotification(post: IPostDoc, verdict: AIVerdict, score: number, reasons: string[]) {
  try {
    const io = getIO();
    const userRoom = ROOMS.user(post.authorId.toString());
    const payload = {
      postId: String(post._id),
      aiVerdict: verdict,
      aiScore: score,
      reasons,
    };
    
    console.log(`[AI Validation] 📡 Emitting ${EVENTS.POST_AI_RESULT} to room ${userRoom}`);
    console.log(`[AI Validation] 📦 Payload:`, JSON.stringify(payload, null, 2));
    
    io.to(userRoom).emit(EVENTS.POST_AI_RESULT, payload);
    
    // Also emit to a general room in case user room fails
    io.emit(`post-${post._id}-result`, payload);
    
    console.log(`[AI Validation] ✅ Socket notification sent successfully for post ${post._id}`);
  } catch (socketError) {
    console.error(`[AI Validation] 📡 Socket notification failed for post ${post._id}:`, socketError);
    // Don't throw - this is not critical enough to fail the whole process
  }
}
