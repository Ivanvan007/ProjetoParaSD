#!/usr/bin/env node

const crypto = require('crypto');

const N = BigInt( 32 );

let slot_a = new Array( N );
let i;
for( i=0; i<N;++i){
  slot_a[ i ] =  0;
}

function get_slot( val ){

  // define md5
  let md5um = crypto.createHash('md5');
  md5um.update( val );
  let md5 = md5um.digest('hex')
  let _1st_16 = '0x' +md5.substr( 0, 16 );

 //console.log( md5 );
 //console.log( _1st_16 );
 let i_64 = BigInt( _1st_16 );
//console.log( i_64 );
let slot = i_64 % N;

  return slot;
}

let s;
let nn = 32 * 1000000;

for ( i = 0; i< nn; ++i ){
  s = get_slot( "" +i );
  slot_a[ s ]++;
  //console.log( s );
}
//console.log( slot_a );
let minv= nn;
let maxv= 0;
for(i = 0;i < N; ++i ){
  console.log(i, slot_a[i] );
  if(  slot_a[i] > maxv ) maxv= slot_a[i];
  if(  slot_a[i] < minv ) minv= slot_a[i];
}
console.log({ minv, maxv, difV: maxv-maxv } );

return;
