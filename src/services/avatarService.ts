// src/services/avatarService.ts

/**
 * Constructs the GitHub avatar URL for a given GitHub username.
 * Uses the direct PNG link: https://github.com/<username>.png
 *
 * @param githubUsername The GitHub username.
 * @returns A string with the avatar URL if username is provided, otherwise null.
 */
export function constructGitHubAvatarUrl(githubUsername: string): string | null {
  if (!githubUsername || typeof githubUsername !== 'string' || githubUsername.trim() === '') {
    // console.warn('constructGitHubAvatarUrl: GitHub username is required and must be a non-empty string.');
    return null;
  }
  // GitHub usernames are case-insensitive in URLs for avatars, but usually stored mixed-case.
  // Trimming is important.
  return `https://github.com/${githubUsername.trim()}.png`;
}
