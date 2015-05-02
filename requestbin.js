var http = require('http'),
    querystring = require('querystring')

module.exports = function(hostname) {
  hostname = hostname || 'requestb.in'
  
  return {
    create:     function( isPrivate, callback ) {
        var props = {}
        if( typeof isPrivate === 'function' ) {
            var callback = isPrivate
        } else if( isPrivate === true ) {
            props.private = 'true'
        }
        talk( hostname, 'POST', 'bins', props, callback )
    },
    get:        function( bin, callback ) { talk( hostname, 'GET', 'bins/'+ bin, callback ) },
    requests:   function( bin, callback ) { talk( hostname, 'GET', 'bins/'+ bin +'/requests', callback ) },
    request:    function( bin, request, callback ) { talk( hostname, 'GET', 'bins/'+ bin +'/requests/'+ request, callback ) }
  }
}

function talk( hostname, method, path, props, callback ) {
    if( typeof props === 'function' ) {
        var callback = props
        var props = {}
    }
    
    var options = {
        host:   hostname,
        path:   '/api/v1/'+ path,
        method: method,
        headers: {
            'User-Agent': 'requestbin.js (https://npmpjs.org/package/requestbin)',
            Accept: 'application/json'
        }
    }
    
    var query = null
    
    if( method == 'POST' && Object.keys( props ).length >= 1 ) {
        var query = querystring.stringify( props )
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
        options.headers['Content-Length'] = query.length
    }
    
    var req = http.request( options )
    
    req.on( 'response', function( res ) {
        var data = ''
        res.on( 'data', function( ch ) { data += ch })
        res.on( 'close', function() { callback( new Error('disconnected') ) })
        res.on( 'end', function() {
            data = data.toString('utf8').trim()
            if( res.statusCode >= 300 ) {
                var err = new Error('HTTP error')
                err.httpCode = res.statusCode
                err.request = options
                err.response = {
                    headers: res.headers,
                    body: data
                }
                callback( err )
            } else if( !data.match( /^(\{.*\}|\[.*\])$/ ) ) {
                var err = new Error('invalid response')
                err.request = options
                err.response = {
                    headers: res.headers,
                    body: data
                }
                callback( err )
            } else {
                data = JSON.parse( data )
                callback( null, data )
            }
        })
    })
    
    req.on( 'error', function( error ) {
        var err = new Error('request failed')
        err.details = error
        callback( err )
    })
    
    req.end( query )
}
