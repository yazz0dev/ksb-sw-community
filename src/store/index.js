import { createStore } from 'vuex';
import user from './modules/user';
import events from './modules/events';

// Internal helper from events module needed by user module for XP calculation
const _calculateWeightedAverageScore = (ratings = []) => {
    // Copy the implementation from events.js or ensure it's correctly exported/imported
    if (!Array.isArray(ratings) || ratings.length === 0) return 0;

    let totalTeacherRatingSum = 0, teacherRatingCount = 0;
    let totalStudentRatingSum = 0, studentRatingCount = 0;

    for (const ratingEntry of ratings) {
        if (!ratingEntry || typeof ratingEntry !== 'object' || !ratingEntry.rating || typeof ratingEntry.rating !== 'object') continue;
        const rating = ratingEntry.rating;
        const design = Number(rating.design) || 0;
        const presentation = Number(rating.presentation) || 0;
        const problemSolving = Number(rating.problemSolving) || 0;
        const execution = Number(rating.execution) || 0;
        const technology = Number(rating.technology) || 0;
        const overallRating = (design + presentation + problemSolving + execution + technology) / 5.0;

        if (ratingEntry.isTeacherRating) {
            totalTeacherRatingSum += overallRating; teacherRatingCount++;
        } else {
            totalStudentRatingSum += overallRating; studentRatingCount++;
        }
    }
    const averageTeacherRating = teacherRatingCount > 0 ? totalTeacherRatingSum / teacherRatingCount : 0;
    const averageStudentRating = studentRatingCount > 0 ? totalStudentRatingSum / studentRatingCount : 0;
    const weightedAverage = 0.7 * averageTeacherRating + 0.3 * averageStudentRating;
    return Math.max(0, Math.min(5, weightedAverage));
};


export default createStore({
  modules: {
    user,
    events
  },
  // Add the helper function directly to the root store's getters for internal access
  // Prefix with underscore to indicate internal use
  getters: {
     'events/_calculateWeightedAverageScore': () => _calculateWeightedAverageScore,
  }
});