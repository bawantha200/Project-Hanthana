require('dotenv').config();
const supabase = require('./src/config/db'); // adjust path

(async () => {
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload('test.txt', Buffer.from('hello'), { contentType: 'text/plain' });

  console.log(error ? 'Error:' : 'Success:', error || data);
})();