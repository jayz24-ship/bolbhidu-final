import { Post } from '../models/Post.js';
import { getIO } from './socket.js';
import { EVENTS, ROOMS } from '../utils/constants.js';
import { verifyIssueWithAI } from './ai-verification.js';
import { cloudinary } from '../config/cloudinary.js';
export async function enqueueAndValidatePost(post) {
    // Run AI verification asynchronously
    setTimeout(async () => {
        try {
            // Get the first image URL if available
            let imageUrl;
            if (post.media.length > 0 && post.media[0].type === 'image') {
                imageUrl = cloudinary.url(post.media[0].publicId, {
                    resource_type: 'image',
                    transformation: [{ width: 800, crop: 'scale' }]
                });
            }
            // Call AI verification service
            const aiResult = await verifyIssueWithAI(post.description, post.category, post.locationName, imageUrl);
            // Determine verdict based on AI score - much stricter
            let verdict;
            if (!aiResult.isValid || aiResult.score < 60) {
                // Reject if explicitly marked invalid OR score below 60
                verdict = 'rejected';
            }
            else if (aiResult.score >= 70) {
                // Accept only high-confidence results
                verdict = 'accepted';
            }
            else {
                // Scores between 60-70: accept with caution
                verdict = 'accepted';
            }
            // Update post with AI results
            await Post.findByIdAndUpdate(post._id, {
                aiVerdict: verdict,
                aiScore: aiResult.score,
                aiReasons: [aiResult.reason],
            });
            // Notify user via socket
            const io = getIO();
            io.to(ROOMS.user(post.authorId.toString())).emit(EVENTS.POST_AI_RESULT, {
                postId: String(post._id),
                aiVerdict: verdict,
                aiScore: aiResult.score,
                reasons: [aiResult.reason],
            });
            console.log(`[AI Validation] Post ${post._id}: ${verdict} (score: ${aiResult.score}, valid: ${aiResult.isValid})`);
        }
        catch (error) {
            console.error('[AI Validation] Error:', error);
            // Fallback: Reject suspicious posts if AI fails (safer default)
            // We only auto-accept if the error was a service issue, not a validation issue
            await Post.findByIdAndUpdate(post._id, {
                aiVerdict: 'rejected',
                aiScore: 30,
                aiReasons: ['AI verification service unavailable - rejected for safety. Please try again with more detail.'],
            });
            // Notify user about the rejection
            try {
                const io = getIO();
                io.to(ROOMS.user(post.authorId.toString())).emit(EVENTS.POST_AI_RESULT, {
                    postId: String(post._id),
                    aiVerdict: 'rejected',
                    aiScore: 30,
                    reasons: ['AI verification service unavailable. Please resubmit with clear, detailed description of the issue.'],
                });
            }
            catch (socketError) {
                console.error('[AI Validation] Socket notification error:', socketError);
            }
        }
    }, 1500); // Slightly longer delay for AI processing
}
//# sourceMappingURL=aiValidation.js.map