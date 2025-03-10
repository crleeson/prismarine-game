// Chunk dimensions
export const CHUNK_WIDTH = 100;
export const CHUNK_DEPTH = 100;
export const CHUNK_HEIGHT = 100;

// Chunk boundaries (derived from dimensions)
export const CHUNK_MIN_X = -CHUNK_WIDTH / 2; // -50
export const CHUNK_MAX_X = CHUNK_WIDTH / 2; // 50
export const CHUNK_MIN_Y = 0;
export const CHUNK_MAX_Y = CHUNK_HEIGHT; // 100
export const CHUNK_MIN_Z = -CHUNK_DEPTH / 2; // -50
export const CHUNK_MAX_Z = CHUNK_DEPTH / 2; // 50

// Player controls
export const DEFAULT_MAX_SPEED = 10;
export const STRAFE_SPEED = 5;
export const DASH_DURATION = 0.5;
export const DASH_COOLDOWN = 2;
export const POST_DASH_DECAY = 1;
export const SPEED_ACCELERATION = 5;
export const SPEED_DECELERATION = 10;
export const SPEED_IDLE_DECELERATION = 5;
export const MOUSE_SENSITIVITY = 0.001;

// Decorations
export const LARGE_ROCK_COUNT = 8;
export const SMALL_ROCK_COUNT = 60;
export const BUNCH_COUNT = 4;
export const CORAL_COUNT_MIN = 15;
export const CORAL_COUNT_RANGE = 16; // Results in 15 to 30 corals
export const DECORATION_BASE_HEIGHT = -5;

// Particles
export const PARTICLE_DENSITY = 0.00046875;
export const PARTICLE_SIZE = 0.2;
export const BASE_PARTICLE_SPEED = 0.0075;

// Camera
export const BASE_CAMERA_DISTANCE = 2.5;

// Water
export const WATER_HEIGHT = 100;

// Seabed
export const SEABED_SEGMENTS = 32;
export const SEABED_BASE_HEIGHT = -5;

// Player
export const MAX_WAIT_TIME = 5000;

// Server
export const MAX_CLIENTS = 100;
