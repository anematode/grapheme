export default {
  input: 'src/main.js',
  onwarn: function ( message ) {
    if ( /rewritten/.test( message ) ) return;
    console.error( message.message );
  },
  output: {
    file: 'build/grapheme.js',
    format: 'umd',
    name: 'Grapheme'
  }
};
