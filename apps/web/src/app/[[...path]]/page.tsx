import App from '@/features/App';
export default async function Page({params}:{params:Promise<{path?:string[]}>}){const {path=[]}=await params;return <App route={path}/>;}
