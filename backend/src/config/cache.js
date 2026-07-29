const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 60, // Default TTL 60 seconds
  checkperiod: 120,
  useClones: false,
});

const cacheService = {
  get: (key) => {
    try {
      return cache.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return undefined;
    }
  },
  
  set: (key, value, ttl = 60) => {
    try {
      return cache.set(key, value, ttl);
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },
  
  del: (key) => {
    try {
      return cache.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },
  
  flush: () => {
    try {
      return cache.flushAll();
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }
};

module.exports = cacheService;