export const _calculateWeightedAverageScore = (ratings = []) => {
    if (!Array.isArray(ratings) || ratings.length === 0) return 0;

    let totalRatingSum = 0;
    let ratingCount = 0;

    for (const ratingEntry of ratings) {
        if (!ratingEntry || typeof ratingEntry !== 'object' || !ratingEntry.rating || typeof ratingEntry.rating !== 'object') continue;

        const rating = ratingEntry.rating;
        const design = Number(rating.design) || 0;
        const presentation = Number(rating.presentation) || 0;
        const problemSolving = Number(rating.problemSolving) || 0;
        const execution = Number(rating.execution) || 0;
        const technology = Number(rating.technology) || 0;

        const overallRating = (design + presentation + problemSolving + execution + technology) / 5.0;

        totalRatingSum += overallRating;
        ratingCount++;
    }

    return ratingCount > 0 ? Math.max(0, Math.min(5, totalRatingSum / ratingCount)) : 0;
};
