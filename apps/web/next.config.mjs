const backend=process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000';
export default {
 output:'standalone', skipTrailingSlashRedirect:true, poweredByHeader:false,
 async rewrites(){return [{source:'/api/v1/:path*',destination:`${backend}/api/v1/:path*/`},{source:'/dev-assets/:path*',destination:`${backend}/dev-assets/:path*/`}];},
 async headers(){return [{source:'/:path*',headers:[{key:'Cross-Origin-Opener-Policy',value:'same-origin'},{key:'Cross-Origin-Embedder-Policy',value:'require-corp'},{key:'Cross-Origin-Resource-Policy',value:'same-origin'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'same-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]},{source:'/sw.js',headers:[{key:'Cache-Control',value:'no-cache'},{key:'Service-Worker-Allowed',value:'/'}]},{source:'/runtime/:path*',headers:[{key:'Content-Security-Policy',value:"default-src 'self' blob:; script-src 'self' blob: 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; frame-ancestors 'self'; base-uri 'none'"}]}];}
};
