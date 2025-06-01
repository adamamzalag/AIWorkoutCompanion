// One-time script to update all exercises with YouTube videos
import { storage } from './server/storage.js';
import { updateExerciseVideos } from './server/youtube.js';

console.log('Starting YouTube video update for all existing exercises...');

updateExerciseVideos(storage)
  .then(() => {
    console.log('YouTube video update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error updating exercise videos:', error);
    process.exit(1);
  });