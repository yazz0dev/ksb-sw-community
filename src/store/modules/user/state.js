export default {
  studentList: [],
  studentListLastFetch: null, // Timestamp of last fetch
  studentListTTL: 1000 * 60 * 60, // 1 hour TTL
  studentListLoading: false,
  studentListError: null,
  nameCache: new Map(), // Cache for user names
  nameCacheTTL: 1000 * 60 * 30, // 30 minute TTL for names
};