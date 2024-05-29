const proxy = require('express-http-proxy');

const app = require('express')();

const request = require('request');

const start_at = new Date();

function f1(req,resp, next){
  console.log( "f1 => name:", next.name, ", url:", req.url );
  next(  );
}


// Defining backend servers
let servers = {
  "abc": {
    id: "abc",
    host: 'http://localhost:3000',
    proxy: proxy('http://localhost:3000'),
    usage: 0
  },
  "cde": {
    id: "cde",
    host: 'http://localhost:3100',
    proxy: proxy('http://localhost:3100'),
    usage: 0
  }
    };
function re_direct( req, resp, next ){

  let id = req.query.id;
	
	console.log( "id:", id, "re_direct => url:", req.url, ", id:", id, ", path:",  req.path, ", params:", req.params, ", query:", req.query );

  let server = servers[ id ];

  if( ! server ){
    return next( { error: "wrong server id" } );
  }
  else{

    server.usage++;
    server.proxy( req, resp, next );
  }
}

app.use('/api', re_direct);

app.use('/stat', function( req, resp, next ){
  let servers_a = Object.values( servers );
	let servers_n = servers_a.length;
	//console.log( servers_n, servers_a );
	let living_time_in_secs = Math.round( ( Date.now() - start_at.getTime() ) * 0.001 );
	let i= 0;
	let stat = [];
	for( i=0; i<servers_n; ++i ){
	  let server = servers_a[ i ];
	  stat.push( {
	    id: server.id,
	    host: server.host,
	    usage: server.usage
	    });
	}
	  console.table( stat );

	  resp.status(200).send( {
	    success: true,
            start_at: start_at.toISOString(),
            now: (new Date()).toISOString(),
	    living_time_in_secs,
	    stat } );
});

app.listen(4000, () => {

  request('http://localhost:3000', function (err, res, body) {

	  //if(err) console.log( "err:", err );
	  ////if(res) console.log( "res:", res );
	  //console.log( "body:", body );
   if(err === null){

        console.log('frontend is reachable from proxy server')

   }
   else{

    console.log('frontend is NOT reachable from proxy server')

   }

  });

});
