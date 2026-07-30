// Virtualized list for large datasets
export const useVirtualizedList = (items, itemHeight = 50, containerHeight = 600) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e) => setScrollTop(e.currentTarget.scrollTop)
  };
};

// Batch updates
export const batchUpdate = (updates, delay = 100) => {
  let timeoutId;
  const queue = [];
  
  return (update) => {
    queue.push(update);
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      updates(queue);
      queue.length = 0;
    }, delay);
  };
};