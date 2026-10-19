import type {Metadata,Viewport} from 'next';import './globals.css';
export const metadata:Metadata={title:'Rewind — your pocket arcade',description:'Download, play and keep your retro collection offline. Games run on your device.',manifest:'/manifest.webmanifest',applicationName:'Rewind'};
export const viewport:Viewport={themeColor:'#10131d',width:'device-width',initialScale:1};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
